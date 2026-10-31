<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeders_can_run_more_than_once(): void
    {
        // Regression: `migrate --seed` on a database that already had the test user crashed
        // with a duplicate email.
        $this->seed();
        $this->seed();
        $this->seed(DemoSeeder::class);
        $this->seed(DemoSeeder::class);

        $this->assertSame(1, User::where('email', 'test@example.com')->count());
        $this->assertSame(6, User::count());
        $this->assertSame(4, Conversation::count());
    }
}
