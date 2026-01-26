# AD Web Manager

A Node.js web application for managing Active Directory Users and Groups using LDAP.

## Features
-   **LDAP Authentication**: Secure login using AD credentials.
    -   Uses "Admin Bind -> Search -> User Bind" flow for robustness.
-   **User Management**:
    -   Search users by Name or Username.
    -   View user details.
    -   Edit user attributes (Description, Telephone, etc.).
    -   *Safe Mode*: Prevents accidental deletion of critical attributes like `userAccountControl`.
-   **Group Management**:
    -   Search and list groups.
    -   View group members.
    -   **Edit Group**: Add or remove members via simple text interface (DN list).
-   **Debug Logging**: Detailed "LDAP Debug" logs for troubleshooting.

## Prerequisites
-   **Node.js**: v14+ recommended.
-   **Active Directory**: Access to an LDAP/LDAPS server.
-   **Service Account**: An AD user with read/write permissions to the OU(s) you want to manage (`LDAP_ADMIN_DN`).

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Tiozao-do-Linux/adwebjs.git
    cd adwebjs
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Configuration

Create a `.env` file in the root directory based on the example below:

```env
PORT=3000
SESSION_SECRET=supersecretkey_change_me

# LDAP Connection
LDAP_URL=ldaps://auth.yourdomain.com
LDAP_BASE_DN=DC=yourdomain,DC=com

# Authenticated Bind (Service Account)
# Required for searching users/groups and performing updates
LDAP_ADMIN_DN=CN=Administrator,CN=Users,DC=yourdomain,DC=com
LDAP_ADMIN_PASSWORD=YourStrongPassword

# Domain suffix for binding (fallback)
LDAP_DOMAIN=yourdomain.com

# Group required to access the application
LDAP_GROUP_REQUIRED=ADWEB-Admin
```

### Important Notes
-   **LDAP_ADMIN_DN**: Must be the full Distinguished Name (DN) or UPN of the admin user.
-   **LDAP_URL**: Use `ldaps://` for secure connections (port 636) or `ldap://` (port 389).

## Running the Application

1.  **Start the server**:
    ```bash
    npm start
    ```

2.  **Access the web interface**:
    Open your browser and navigate to `http://localhost:3000`.

3.  **Login**:
    Use your Active Directory username and password.

## Usage Walkthrough

### 1. Login
-   Enter your AD credentials.
-   If you are an admin (member of `LDAP_GROUP_REQUIRED` group by default check in `routes/auth.js`), you will be granted access.

### 2. Manage Users
-   Go to **Manage Users**.
-   Use the search bar to find a user.
-   Click **Edit** to modify details.
    -   **Note**: Changing `cn` or `userPrincipalName` is restricted in this simple editor to prevent errors. Use AD tools for renames.

### 3. Manage Groups
-   Go to **Manage Groups**.
-   Search for a group.
-   Click **Edit**.
-   To **Add a Member**: Add their full DN (e.g., `CN=John Doe,OU=Users...`) on a new line.
-   To **Remove a Member**: Delete the line containing their DN.
-   Click **Save**.

## Troubleshooting

-   **"Unwilling To Perform"**: This usually happens if you try to modify a restricted attribute (like `cn` or `sAMAccountName`) or send an invalid value (like creating an empty mandatory attribute). Check the console logs for "LDAP Debug" messages.
-   **"User not found"**: Verify `LDAP_BASE_DN` and `LDAP_ADMIN_DN` are correct. The system uses the Admin account to find users before logging in.
