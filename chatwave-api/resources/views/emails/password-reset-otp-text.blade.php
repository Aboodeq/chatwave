{{ __('Your ChatWave password reset code is: :code', ['code' => $code]) }}

{{ __("This code expires in :minutes minutes. If you didn't ask to reset your password, you can ignore this email; your password won't change.", ['minutes' => $expiresInMinutes]) }}
