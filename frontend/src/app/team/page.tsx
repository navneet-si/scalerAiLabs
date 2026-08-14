import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export default function TeamPage() {
  return (
    <PlaceholderPage 
      title="Team"
      navGroups={[
        {
          items: [
            { label: "Members", active: true },
            { label: "Groups" },
            { label: "Pending Invites" }
          ]
        }
      ]}
      description="Team management will be available in a future update."
    />
  );
}
