# Notification Service - Product Requirements

Delivers email notifications, in-app notifications, and broadcast announcements for the Art Academy platform.

## Roles & Features

### Principal

- Send ad-hoc notifications to any user.
- Create announcements to all students, all teachers, or a teacher's students.
- View announcement history.
- Grant or revoke a teacher's broadcast permission and review current permissions.

### Teacher

- Create announcements only when granted `canBroadcast`.

### All Users

- View their own notifications (paginated).
- Mark individual notifications or all notifications as read.
- See their unread notification count.

## Automatic Notifications

| Event | Notification |
| --- | --- |
| Fee generated | Fee reminder email |
| Payment received | Payment confirmation email |
| Attendance recorded (ABSENT) | Absence alert |
| Exam scheduled | Exam notice to enrolled students |

## Notes

- Email (Gmail SMTP, StartTLS) is the live delivery channel.
- SMS is modelled (EMAIL / SMS / BOTH) but not connected to a live transport.
