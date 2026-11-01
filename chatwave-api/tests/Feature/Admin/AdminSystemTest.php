<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_health_lists_checks_without_secrets(): void
    {
        config(['app.debug' => true, 'cors.allowed_origins' => ['*'], 'mail.default' => 'log', 'services.sms.driver' => 'log']);

        $response = $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/admin/system')
            ->assertOk()
            ->assertJsonStructure([
                'app' => ['environment', 'debug', 'laravel', 'php'],
                'services' => ['database', 'queue', 'failed_jobs', 'mail', 'sms'],
                'storage' => ['avatars', 'avatar_bytes'],
                'checks' => [['key', 'status', 'title', 'detail']],
            ]);

        $checks = collect($response->json('checks'))->keyBy('key');
        $this->assertSame('warning', $checks['sms']['status']);
        $this->assertSame('warning', $checks['mail']['status']);
        $this->assertSame('info', $checks['debug']['status']); // fine outside production

        $this->assertStringNotContainsString((string) config('app.key'), $response->getContent());
    }
}
