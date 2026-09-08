<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Sign in as a user on a clean session.
     *
     * The app runs AuthenticateSession, which ties a session to the password
     * hash of whoever created it. Calling actingAs() twice in one test
     * therefore hands the second user a session stamped for the first, and the
     * middleware correctly logs them straight back out — so the session has to
     * be dropped in between.
     */
    protected function actingFresh(User $user): static
    {
        $this->flushSession();

        return $this->actingAs($user);
    }
}
