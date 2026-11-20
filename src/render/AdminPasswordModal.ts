/** AdminPasswordModal.ts - renders the admin login dialog; App.ts handles authentication and button events. */
/** Takes no arguments and returns password-dialog HTML with login, cancel, and initially hidden error controls. */
const adminPasswordBrandUrl = new URL('../assets/osu-brand-horizontal-primary.png', import.meta.url).href;
const adminPasswordBrandDarkUrl = new URL('../assets/osu-brand-horizontal-reversed-scarlet.png', import.meta.url).href;

export function AdminPasswordModal(): string {
  return `
    <div class="modal-overlay">
      <div class="modal-content admin-password-modal">
        <img class="admin-password-brand admin-password-brand-light" src="${adminPasswordBrandUrl}" alt="The Ohio State University" width="344" height="50">
        <img class="admin-password-brand admin-password-brand-dark" src="${adminPasswordBrandDarkUrl}" alt="The Ohio State University" width="546" height="79">
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
