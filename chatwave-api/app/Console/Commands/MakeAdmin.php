<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

#[Signature('chatwave:make-admin {account : The email address or phone number of the account} {--revoke : Make them a Member instead}')]
#[Description('Give an account admin access to the dashboard (or take it away)')]
class MakeAdmin extends Command
{
    public function handle(): int
    {
        $account = trim((string) $this->argument('account'));
        $phone = Phone::normalize($account);

        $user = Phone::isValid($phone)
            ? User::firstWhere('phone', $phone)
            : User::firstWhere('email', Str::lower($account));

        if (! $user) {
            $this->components->error("No account uses {$account}.");

            return self::FAILURE;
        }

        $role = $this->option('revoke') ? Role::member() : Role::admin();
        $user->forceFill(['role_id' => $role->id])->save();

        $this->components->info($role->isAdmin()
            ? "{$user->name} is now an admin."
            : "{$user->name} is no longer an admin.");

        return self::SUCCESS;
    }
}
