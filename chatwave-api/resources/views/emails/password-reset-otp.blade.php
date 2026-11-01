<!DOCTYPE html>
@php($rtl = app()->getLocale() === 'ar')
<html lang="{{ app()->getLocale() }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>{{ __('Your ChatWave password reset code') }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Tahoma, Helvetica, Arial, sans-serif; color:#0e1a22; text-align:{{ $rtl ? 'right' : 'left' }};">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
        {{ __('Your code is :code. It expires in :minutes minutes.', ['code' => $code, 'minutes' => $expiresInMinutes]) }}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;">
        <tr>
            <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
                    <tr>
                        <td style="padding:0 8px 20px; font-size:18px; font-weight:700; letter-spacing:-0.01em; color:#0f7f7c;">
                            ChatWave
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#ffffff; border:1px solid #e2e7ec; border-radius:16px; padding:36px 32px;">
                            <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; font-weight:700; color:#0e1a22;">
                                {{ __('Reset your password') }}
                            </h1>
                            <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#51606d;">
                                {{ __('Enter this code in ChatWave to choose a new password. It expires in :minutes minutes.', ['minutes' => $expiresInMinutes]) }}
                            </p>
                            <div style="margin:0 0 24px; padding:18px 12px; background-color:#effcfb; border:1px solid #aeebe5; border-radius:12px; text-align:center; font-family:'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace; font-size:32px; font-weight:700; letter-spacing:10px; color:#0e1a22;" dir="ltr">
                                {{ $code }}
                            </div>
                            <p style="margin:0; font-size:13px; line-height:1.6; color:#677580;">
                                {{ __("Didn't ask for this? You can ignore this email. Your password won't change, and no one can use this code without access to your inbox.") }}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 8px 0; font-size:12px; line-height:1.6; color:#8a96a1;">
                            {{ __('For your security, ChatWave will never ask you for this code by phone or chat.') }}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
