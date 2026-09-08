<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * The only way an account gains staff access — `is_admin` is not mass
 * assignable, so registration and profile edits can never grant it.
 */
class PromoteAdmin extends Command
{
    protected $signature = 'admin:promote {email : The account to grant staff access}
                            {--demote : Revoke staff access instead}';

    protected $description = 'Grant or revoke J.J. Serow admin access for an account';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();

        if (! $user) {
            $this->error("No account found for {$this->argument('email')}.");

            return self::FAILURE;
        }

        $demote = (bool) $this->option('demote');
        $user->forceFill(['is_admin' => ! $demote])->save();

        $this->info(sprintf(
            '%s (%s) is %s an admin.',
            $user->name,
            $user->email,
            $demote ? 'no longer' : 'now',
        ));

        return self::SUCCESS;
    }
}
