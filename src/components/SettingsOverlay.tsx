// Edits and returns form for username change.
export default function SettingsOverlay({
  username,
  onClose,
  onSave,
}: {
  username: string;
  onClose: () => void;
  onSave: (username: string) => void;
}) {
  return (
    <div className="settings-backdrop">
      <form
        className="settings-form"
        action={(form) => onSave(String(form.get('username')))}
      >
        <h2 className="settings-title">Settings</h2>

        <label className="settings-field">
          Username
          <input name="username" defaultValue={username} required />
        </label>

        <div className="settings-actions">
          <button type="button" onClick={onClose}>
            cancel
          </button>
          <button type="submit">save</button>
        </div>
      </form>
    </div>
  );
}
