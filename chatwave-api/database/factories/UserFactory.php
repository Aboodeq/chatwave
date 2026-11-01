<?php

namespace Database\Factories;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role_id' => fn () => Role::member()->id,
        ];
    }

    /**
     * An account created with a phone number instead of an email address.
     */
    public function withPhone(?string $phone = null): static
    {
        return $this->state(fn (array $attributes) => [
            'email' => null,
            'email_verified_at' => null,
            'phone' => $phone ?? '+1555'.fake()->unique()->numerify('#######'),
            'phone_verified_at' => now(),
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role_id' => Role::admin()->id]);
    }

    public function withRole(Role $role): static
    {
        return $this->state(fn (array $attributes) => ['role_id' => $role->id]);
    }

    public function suspended(string $reason = 'Spam'): static
    {
        return $this->state(fn (array $attributes) => [
            'suspended_at' => now(),
            'suspension_reason' => $reason,
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
