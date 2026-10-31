<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // firstOrCreate so seeding twice (e.g. `migrate --seed` on an existing database)
        // doesn't fail on the unique email.
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => 'password', 'email_verified_at' => now()],
        );

        // Sample people and conversations, so the chat UI has something to show.
        if (app()->isLocal()) {
            $this->call(DemoSeeder::class);
        }
    }
}
