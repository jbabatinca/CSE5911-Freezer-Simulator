export function AdminPasswordModal(): string {
  return `
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Admin Mode</h2>
        <p>Enter admin password to access configuration and training upload features.</p>
        <input
          type="password"
          id="admin-password-input"
          placeholder="Enter password"
          style="width: 100%; padding: 8px; margin: 10px 0; box-sizing: border-box;"
        />
        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <button id="btn-admin-login" style="flex: 1;">Login</button>
          <button id="btn-cancel-admin" style="flex: 1;">Cancel</button>
        </div>
        <div id="admin-password-error" style="color: red; margin-top: 10px; display: none;"></div>
      </div>
    </div>
  `;
}
