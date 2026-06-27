<?php
class BDM {
    public static function register(array $post, array $files): void {
        @set_time_limit(120);
        @ignore_user_abort(true);
        Auth::verifyCsrf();


        $email      = filter_var(trim($post['email'] ?? ''), FILTER_VALIDATE_EMAIL);
        $fullName   = htmlspecialchars(trim($post['full_name'] ?? ''), ENT_QUOTES, 'UTF-8');
        $fatherName = htmlspecialchars(trim($post['father_name'] ?? ''), ENT_QUOTES, 'UTF-8');
        $phone      = htmlspecialchars(trim($post['phone'] ?? ''), ENT_QUOTES, 'UTF-8');
        $cnicRaw    = trim($post['cnic_number'] ?? '');
        $password        = $post['password'] ?? '';
        $confirmPassword = $post['confirm_password'] ?? '';

        if (!$email)                     Auth::jsonError('Invalid email address.');

        // Strict validation: check for temporary/spam email domains and check MX record
        $emailParts = explode('@', $email);
        $emailDomain = strtolower(end($emailParts));
        
        $spamBlacklist = [
            'mailinator.com', 'yopmail.com', 'tempmail.com', '10minutemail.com', 
            'dispostable.com', 'guerrillamail.com', 'getairmail.com', 'sharklasers.com', 
            'trashmail.com', 'maildrop.cc', 'temp-mail.org', 'fakeinbox.com', 
            'throwawaymail.com', 'getnada.com', 'boun.cr', 'tempmailaddress.com', 'tempmail.net',
            'guerrillamailblock.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
            'guerrillamail.co.uk', 'generator.email', 'mailnesia.com', 'inboxkitten.com',
            'temp-mail.io', 'torvzn.com', 'fastestmail.sbs', 'duck.com', 'temp-mail.ru',
            'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.org', 'spamgourmet.com',
            'mailinator2.com', 'sogetthis.com', 'mailin8r.com', 'streetwisemail.com',
            'verymuchtomypiking.com', 'mailinator.net', 'zippymail.info', 'spam4.me',
            'disposable.com', 'tempmail.co', 'tempmail.dev', 'tempmail.live', 'tempmail.space',
            'crazymailing.com', 'zillamail.com', 'mytrashmail.com', 'mailcatch.com',
            'tempmailaddress.xyz', 'temp-mail.xyz', 'temp-mail.website', 'temp-mail.tech'
        ];
        
        if (in_array($emailDomain, $spamBlacklist, true)) {
            Auth::jsonError('Registration using temporary or disposable email addresses is not allowed.');
        }

        // DNS MX Check (Skip for local development domains)
        $localDomains = ['localhost', 'local', 'test', 'example.com'];
        $isLocal = false;
        foreach ($localDomains as $ld) {
            if ($emailDomain === $ld || str_ends_with($emailDomain, '.' . $ld)) {
                $isLocal = true;
                break;
            }
        }
        if (!$isLocal && function_exists('checkdnsrr')) {
            if (!checkdnsrr($emailDomain, 'MX')) {
                Auth::jsonError('The email domain does not have a valid MX record. Please use a real email address.');
            }
        }

        if (!$fullName || !$fatherName || !$phone) Auth::jsonError('All required fields must be filled.');
        if (!preg_match('/^\d{4}-\d{7}$/', $phone)) {
            Auth::jsonError('Phone number must be exactly 11 digits formatted as 03XX-XXXXXXX (e.g. 0318-6072309).');
        }

        // Pakistani CNIC validation: XXXXX-XXXXXXX-X  (13 digits + 2 dashes)
        // User submits digits only (no dashes); we format it server-side.
        $cnicDigits = preg_replace('/\D/', '', $cnicRaw); // strip any dashes the user may have typed
        if (!preg_match('/^\d{13}$/', $cnicDigits)) {
            Auth::jsonError('CNIC must be exactly 13 digits in the format 00000-0000000-0.');
        }
        // Re-format to canonical XX-XXX-XXXXXXX-X (NADRA standard: 5-7-1)
        $cnicFormatted = substr($cnicDigits, 0, 5) . '-' . substr($cnicDigits, 5, 7) . '-' . substr($cnicDigits, 12, 1);

        if (strlen($password) < 8)       Auth::jsonError('Password must be at least 8 characters.');
        if ($password !== $confirmPassword) Auth::jsonError('Passwords do not match.');

        $acceptTerms = (int) ($post['accept_terms'] ?? 0);
        if ($acceptTerms !== 1) {
            Auth::jsonError('You must accept the Terms & Conditions and Privacy Policy to proceed.');
        }

        if (Database::row("SELECT id FROM users WHERE email = ?", [$email])) {
            Auth::jsonError('An account with this email already exists.');
        }

        $db = DB::get();
        $db->beginTransaction();
        try {
            $userId = Database::insert('users', [
                'email'      => $email,
                'full_name'  => $fullName,
                'password'   => password_hash($password, PASSWORD_BCRYPT),
                'role'       => 'bdm',
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $folderName = $fullName . '-' . $userId;

            $uniFront   = FileHandler::upload($files['university_card_front'] ?? [], 'uni_front', $folderName);
            $uniBack    = !empty($files['university_card_back']['tmp_name'])
                          ? FileHandler::upload($files['university_card_back'], 'uni_back', $folderName) : null;
            $profilePic = FileHandler::upload($files['profile_picture'] ?? [], 'profile', $folderName);

            if (!$uniFront || !$profilePic) {
                if ($uniFront) FileHandler::delete($uniFront);
                if ($uniBack) FileHandler::delete($uniBack);
                if ($profilePic) FileHandler::delete($profilePic);

                throw new Exception('Failed to upload required documents. Use JPG, PNG, or PDF under 5MB.');
            }

            // AES-256 encrypt the CNIC number before storing in DB
            $encryptedCnic = FileHandler::encryptField($cnicFormatted);

            Database::insert('mk9_bdm_profiles', [
                'user_id'               => $userId,
                'full_name'             => $fullName,
                'father_name'           => $fatherName,
                'phone'                 => $phone,
                'cnic_number'           => $encryptedCnic,
                'university_card_front' => $uniFront,
                'university_card_back'  => $uniBack,
                'profile_picture'       => $profilePic,
                'status'                => 'pending',
                'can_edit'              => 1,
                'terms_accepted_at'     => date('Y-m-d H:i:s'),
                'created_at'            => date('Y-m-d H:i:s'),
            ]);

            Database::insert('mk9_activity_log', [
                'user_id'    => $userId,
                'action'     => 'bdm_registered',
                'details'    => $fullName . ' submitted BDM application.',
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $db->commit();

            // Notify admin about new BDM application
            @Mailer::newBDMApplication(MAIL_TO_ADMIN, $fullName, $email);

            Auth::jsonSuccess(['message' => 'Application submitted. You will be notified within 1–2 business days.']);
        } catch (Throwable $e) {
            $db->rollBack();
            Auth::jsonError($e->getMessage());
        }
    }

    public static function updateProfile(array $post, array $files): void {
        Auth::verifyCsrf();
        Auth::requireAjaxAuth();

        $userId  = Auth::userId();
        $profile = self::getProfile($userId);
        if (!$profile) Auth::jsonError('Profile not found.');

        $data = [];
        if (!empty($post['full_name'])) {
            $data['full_name'] = htmlspecialchars(trim($post['full_name']), ENT_QUOTES, 'UTF-8');
        }
        if (!empty($post['phone'])) {
            $phone = htmlspecialchars(trim($post['phone']), ENT_QUOTES, 'UTF-8');
            if (!preg_match('/^\d{4}-\d{7}$/', $phone)) {
                Auth::jsonError('Phone number must be exactly 11 digits formatted as 03XX-XXXXXXX (e.g. 0318-6072309).');
            }
            $data['phone'] = $phone;
        }

        if (empty($data)) Auth::jsonError('No changes submitted.');

        $data['updated_at'] = date('Y-m-d H:i:s');
        Database::update('mk9_bdm_profiles', $data, ['user_id' => $userId]);

        if (isset($data['full_name'])) {
            Database::update('users', ['full_name' => $data['full_name']], ['id' => $userId]);
        }

        Auth::jsonSuccess(['message' => 'Profile updated successfully.']);
    }

    public static function getProfile(int $userId): ?object {
        return Database::row(
            "SELECT p.*, u.email FROM mk9_bdm_profiles p
             JOIN users u ON u.id = p.user_id
             WHERE p.user_id = ?",
            [$userId]
        );
    }
}
