export function AdminSettingsModal(): string {
  return `
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Admin Settings</h2>
        <div style="margin: 20px 0;">
          <h3>Change Admin Password</h3>
          <input
            type="password"
            id="current-password-input"
            placeholder="Current password"
            style="width: 100%; padding: 8px; margin: 10px 0; box-sizing: border-box;"
          />
          <input
            type="password"
            id="new-password-input"
            placeholder="New password"
            style="width: 100%; padding: 8px; margin: 10px 0; box-sizing: border-box;"
          />
          <input
            type="password"
            id="confirm-password-input"
            placeholder="Confirm new password"
            style="width: 100%; padding: 8px; margin: 10px 0; box-sizing: border-box;"
          />
        </div>
        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <button id="btn-change-password" style="flex: 1;">Change Password</button>
          <button id="btn-close-settings" style="flex: 1;">Close</button>
        </div>
        <div id="settings-message" style="margin-top: 10px;"></div>
      </div>
    </div>
  `;
}
