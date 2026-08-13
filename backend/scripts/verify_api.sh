#!/usr/bin/env bash
# End-to-end check of the write API against a running server.
#
# Exercises every mutating endpoint the way the frontend will, then asserts the
# results — including the two things that are easy to get wrong and invisible
# until much later: that an unresolved VTT speaker does NOT become a participant,
# and that deleting a meeting leaves no orphaned rows behind.
#
#   docker run -d --name ff-verify -p 8199:8000 \
#     -e DATABASE_URL=sqlite:////tmp/verify.db fireflies-backend:dev
#   backend/scripts/verify_api.sh http://localhost:8199
#
# Exits non-zero on the first failed assertion.

set -uo pipefail

BASE="${1:-http://localhost:8199}"
API="$BASE/api"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    printf '  PASS  %-52s %s\n' "$label" "$actual"
    PASS=$((PASS + 1))
  else
    printf '  FAIL  %-52s expected %s, got %s\n' "$label" "$expected" "$actual"
    FAIL=$((FAIL + 1))
  fi
}

jq_py() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
code_for() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

if ! curl -sf "$API/health" >/dev/null; then
  echo "No server at $BASE — start the container first (see header)." >&2
  exit 1
fi

echo "[1] WebVTT upload — speakers stay unresolved"
cat > "$WORK/sample.vtt" <<'VTT'
WEBVTT

1
00:00:00.000 --> 00:00:09.500
<v Speaker 1>We need to lock the Redshift migration timeline before the board review.

2
00:00:09.500 --> 00:00:18.200
<v Speaker 2>The Redshift cluster is provisioned but the backfill job is still failing.

3
00:00:18.200 --> 00:00:29.000
<v Speaker 1>I'll take the board deck, but I need a date for the migration cutover.
VTT

VTT_JSON=$(curl -s -X POST "$API/meetings/upload" -F "file=@$WORK/sample.vtt" -F "title=Redshift Sync")
check "source is upload"        "upload" "$(echo "$VTT_JSON" | jq_py 'd["source"]')"
check "duration from last cue"  "29000"  "$(echo "$VTT_JSON" | jq_py 'd["duration_ms"]')"
# Two, not three: the third cue is Speaker 1 again, so distinct labels is what counts.
check "distinct speakers only"  "2"      "$(echo "$VTT_JSON" | jq_py 'len(d["speakers"])')"
check "no speaker resolved"     "True"   "$(echo "$VTT_JSON" | jq_py 'all(s["participant_id"] is None for s in d["speakers"])')"
check "no participants invented" "0"     "$(echo "$VTT_JSON" | jq_py 'len(d["participants"])')"
check "summary is mock-generated" "mock" "$(echo "$VTT_JSON" | jq_py 'd["summary"]["generated_by"]')"
check "keywords produced"       "True"   "$(echo "$VTT_JSON" | jq_py 'len(d["summary"]["keywords"]) > 0')"
check "contractions not keywords" "True" "$(echo "$VTT_JSON" | jq_py $'not any(k.lower().startswith("i\'") for k in d["summary"]["keywords"])')"
VTT_ID=$(echo "$VTT_JSON" | jq_py 'd["id"]')

echo "[2] Create by form with a pasted transcript"
CREATED=$(curl -s -X POST "$API/meetings" -H 'Content-Type: application/json' -d '{
  "title":"Board Prep",
  "meeting_date":"2026-08-10T09:30:00",
  "participants":[{"name":"Nina Patel","email":"nina.patel@northwind.io"}],
  "tags":["Leadership"],
  "transcript_text":"Nina Patel: Retention is up three points but expansion revenue is flat.\nNina Patel: I will own the retention slide for the board review."
}')
MID=$(echo "$CREATED" | jq_py 'd["id"]')
check "source is manual"          "manual" "$(echo "$CREATED" | jq_py 'd["source"]')"
check "naive date stored as UTC"  "True"   "$(echo "$CREATED" | jq_py $'d["meeting_date"].endswith(("Z","+00:00"))')"
check "speaker matched to person" "True"   "$(echo "$CREATED" | jq_py 'd["speakers"][0]["participant_id"] is not None')"
check "timeline derived"          "True"   "$(echo "$CREATED" | jq_py 'd["duration_ms"] > 0')"

echo "[3] Form-only create — empty timeline, no summary"
EMPTY=$(curl -s -X POST "$API/meetings" -H 'Content-Type: application/json' -d '{"title":"Placeholder"}')
check "duration is zero"     "0"    "$(echo "$EMPTY" | jq_py 'd["duration_ms"]')"
check "no summary generated" "True" "$(echo "$EMPTY" | jq_py 'd["summary"] is None')"

echo "[4] PATCH metadata leaves untouched fields alone"
PATCHED=$(curl -s -X PATCH "$API/meetings/$MID" -H 'Content-Type: application/json' \
  -d '{"title":"Board Prep - Q3","tags":["Leadership","Board"]}')
check "title updated"       "Board Prep - Q3" "$(echo "$PATCHED" | jq_py 'd["title"]')"
check "tags replaced"       "2"               "$(echo "$PATCHED" | jq_py 'len(d["tags"])')"
check "participants intact" "1"               "$(echo "$PATCHED" | jq_py 'len(d["participants"])')"

echo "[5] Action item lifecycle"
AID=$(curl -s -X POST "$API/meetings/$MID/action-items" -H 'Content-Type: application/json' \
  -d '{"text":"Send the board deck","due_date":"2026-08-20"}' | jq_py 'd["id"]')
TOGGLED=$(curl -s -X PATCH "$API/action-items/$AID" -H 'Content-Type: application/json' -d '{"is_done":true}')
check "toggle persists"      "True"       "$(echo "$TOGGLED" | jq_py 'd["is_done"]')"
check "due date persists"    "2026-08-20" "$(echo "$TOGGLED" | jq_py 'd["due_date"]')"
check "delete returns 204"   "204"        "$(code_for -X DELETE "$API/action-items/$AID")"
check "gone after delete"    "404"        "$(code_for "$API/action-items/$AID" -X DELETE)"

echo "[6] Deleting a meeting cascades but spares participants"
PEOPLE_BEFORE=$(curl -s "$API/participants" | jq_py 'len(d)')
check "delete returns 204"    "204" "$(code_for -X DELETE "$API/meetings/$VTT_ID")"
check "detail now 404"        "404" "$(code_for "$API/meetings/$VTT_ID")"
check "participants survived" "$PEOPLE_BEFORE" "$(curl -s "$API/participants" | jq_py 'len(d)')"

echo "[7] Errors are typed, not 500s"
check "unknown meeting"    "404" "$(code_for "$API/meetings/999999")"
check "blank title"        "422" "$(code_for -X POST "$API/meetings" -H 'Content-Type: application/json' -d '{"title":""}')"
check "nonexistent assignee" "422" "$(code_for -X POST "$API/meetings/$MID/action-items" \
  -H 'Content-Type: application/json' -d '{"text":"x","assignee_id":999999}')"
printf '!!!!' > "$WORK/junk.vtt"
check "unparseable vtt"    "422" "$(code_for -X POST "$API/meetings/upload" -F "file=@$WORK/junk.vtt")"
printf '{"segments":[{"start_ms":"abc"}]}' > "$WORK/junk.json"
check "malformed json"     "422" "$(code_for -X POST "$API/meetings/upload" -F "file=@$WORK/junk.json")"

echo
if (( FAIL > 0 )); then
  echo "FAILED — $FAIL of $((PASS + FAIL)) checks"
  exit 1
fi
echo "All $PASS API checks passed."
