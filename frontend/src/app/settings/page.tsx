import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export default function SettingsPage() {
  return (
    <PlaceholderPage 
      title="Settings"
      navGroups={[
        {
          title: "Account",
          items: [
            { label: "Profile", active: true },
            { label: "Preferences" },
            { label: "Notifications" }
          ]
        },
        {
          title: "Workspace",
          items: [
            { label: "Billing" },
            { label: "Integrations" }
          ]
        }
      ]}
      description="Settings management will be available in a future update."
    />
  );
}
