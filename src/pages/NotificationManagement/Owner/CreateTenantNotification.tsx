// Create notification form used by Manager to create notifications for Tenants
// Also reused by Owner through CreateManagerNotification for sending to Manager/Accountant
// Backend automatically determines the notification type based on user role:
// - Owner: type = 'staff' (recipients: manager, accountant)
// - Manager: type = 'tenant' (recipients: tenant)

export { default } from './CreateManagerNotification';
