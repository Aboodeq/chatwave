<?php

namespace App\Enums;

/**
 * Everything a role can allow. Roles store these values; the Admin role always has all.
 */
enum Permission: string
{
    // Chat features
    /** See whether your messages were delivered and seen. */
    case MessageStatus = 'messages.status';

    /** Turn off read receipts, so others can't see when you've read their messages. */
    case HideReadReceipts = 'receipts.hide';

    /** Hide your online status and last seen. */
    case HideOnlineStatus = 'presence.hide';

    // Administration
    case ViewOverview = 'admin.overview';

    case ViewPeople = 'admin.people';

    /** Suspend and restore accounts, and sign people out everywhere. */
    case ModeratePeople = 'admin.moderate';

    /** Create and change roles, and choose people's roles. */
    case ManageRoles = 'admin.roles';

    case ViewActivity = 'admin.activity';

    case ViewSystem = 'admin.system';

    public function isAdministrative(): bool
    {
        return str_starts_with($this->value, 'admin.');
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $permission) => $permission->value, self::cases());
    }
}
