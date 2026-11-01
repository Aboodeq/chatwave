<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Role-based access: each role is a list of permissions (see App\Enums\Permission), and
 * every user has one role. Replaces the users.role column ("user" or "admin").
 *
 * Two built-in roles: Admin (always every permission) and Member (the default for new
 * accounts). A sample Moderator role shows how custom roles work; admins can change or
 * delete it.
 */
return new class extends Migration
{
    private const CHAT = ['messages.status', 'receipts.hide', 'presence.hide'];

    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('key', 32)->nullable()->unique(); // "admin" or "member" for built-in roles
            $table->string('name', 50)->unique();
            $table->string('description', 255)->nullable();
            $table->json('permissions');
            $table->timestamps();
        });

        $now = now();
        $admin = DB::table('roles')->insertGetId([
            'key' => 'admin',
            'name' => 'Admin',
            'description' => 'Full access to everything, including roles and permissions.',
            'permissions' => json_encode([...self::CHAT, 'admin.overview', 'admin.people', 'admin.moderate', 'admin.roles', 'admin.activity', 'admin.system']),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $member = DB::table('roles')->insertGetId([
            'key' => 'member',
            'name' => 'Member',
            'description' => 'Everyone starts here.',
            'permissions' => json_encode(self::CHAT),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('roles')->insert([
            'key' => null,
            'name' => 'Moderator',
            'description' => 'Can see people and suspend accounts, but not change roles or settings.',
            'permissions' => json_encode([...self::CHAT, 'admin.overview', 'admin.people', 'admin.moderate', 'admin.activity']),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('password')->constrained('roles')->restrictOnDelete();
        });

        DB::table('users')->where('role', 'admin')->update(['role_id' => $admin]);
        DB::table('users')->whereNull('role_id')->update(['role_id' => $member]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('user')->after('password')->index();
        });

        $admin = DB::table('roles')->where('key', 'admin')->value('id');
        DB::table('users')->where('role_id', $admin)->update(['role' => 'admin']);

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::dropIfExists('roles');
    }
};
