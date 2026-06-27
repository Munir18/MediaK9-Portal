<?php
class Admin {
    public static function getData(string $tab, string $filter): void {
        Auth::requireAjaxAdmin();

        match ($tab) {
            'stats'    => self::stats(),
            'bdms'     => self::bdms($filter),
            'clients'  => self::clients($filter),
            'projects' => self::projects($filter),
            'changes'  => self::changes($filter),
            'leaderboard' => self::leaderboard(),
            'tickets'  => \Ticket::getAllAdmin($filter),
            default    => Auth::jsonError('Invalid tab.'),
        };
    }

    private static function stats(): void {
        Auth::jsonSuccess([
            'bdms' => [
                'total'    => Database::count("SELECT COUNT(*) FROM mk9_bdm_profiles"),
                'pending'  => Database::count("SELECT COUNT(*) FROM mk9_bdm_profiles WHERE status='pending'"),
                'approved' => Database::count("SELECT COUNT(*) FROM mk9_bdm_profiles WHERE status='approved'"),
            ],
            'clients' => [
                'total'   => Database::count("SELECT COUNT(*) FROM mk9_clients"),
                'pending' => Database::count("SELECT COUNT(*) FROM mk9_clients WHERE status='pending'"),
            ],
            'projects' => [
                'total'     => Database::count("SELECT COUNT(*) FROM mk9_projects"),
                'ongoing'   => Database::count("SELECT COUNT(*) FROM mk9_projects WHERE status='ongoing'"),
                'completed' => Database::count("SELECT COUNT(*) FROM mk9_projects WHERE status='completed'"),
            ],
            'changes' => [
                'pending' => Database::count("SELECT COUNT(*) FROM mk9_change_requests WHERE status='pending'"),
            ],
            'tickets' => [
                'open' => Database::count("SELECT COUNT(*) FROM mk9_tickets WHERE status IN ('open','in-progress')"),
            ],
        ]);
    }

    private static function bdms(string $filter): void {
        $where  = $filter !== 'all' ? "WHERE p.status = ?" : "WHERE 1";
        $params = $filter !== 'all' ? [$filter] : [];

        $rawItems = Database::query(
            "SELECT p.id, p.user_id, p.full_name, p.father_name, p.phone, p.bdm_code,
                    p.cnic_number, p.university_card_front, p.university_card_back,
                    p.profile_picture, p.status, p.admin_notes, p.can_edit, p.terms_accepted_at, p.created_at, p.updated_at,
                    u.email
             FROM mk9_bdm_profiles p
             JOIN users u ON u.id = p.user_id
             {$where} ORDER BY p.created_at DESC",
            $params
        );

        // Decrypt CNIC number for admin display, and dynamically scan for legacy CNIC images
        $items = array_map(function($row) {
            if (!empty($row->cnic_number)) {
                $row->cnic_number = FileHandler::decryptField($row->cnic_number);
            }

            // Dynamically scan uploads folder for legacy CNIC pictures
            $subfolder = $row->full_name . '-' . $row->user_id;
            $cleanedSubfolder = preg_replace('/[^a-zA-Z0-9_\-]/', '-', strtolower($subfolder));
            $cleanedSubfolder = preg_replace('/-+/', '-', $cleanedSubfolder);
            $cleanedSubfolder = trim($cleanedSubfolder, '-');

            $dir = UPLOAD_PATH . $cleanedSubfolder;
            $row->cnic_front = '';
            $row->cnic_back = '';

            if (is_dir($dir)) {
                $files = scandir($dir);
                foreach ($files as $file) {
                    if (strpos($file, 'cnic_front_') === 0 && substr($file, -4) === '.enc') {
                        $row->cnic_front = $cleanedSubfolder . '/' . $file;
                    }
                    if (strpos($file, 'cnic_back_') === 0 && substr($file, -4) === '.enc') {
                        $row->cnic_back = $cleanedSubfolder . '/' . $file;
                    }
                }
            }
            return $row;
        }, $rawItems);

        Auth::jsonSuccess([
            'items'  => $items,
            'counts' => [
                'all'        => Database::count("SELECT COUNT(*) FROM mk9_bdm_profiles"),
                'pending'    => Database::count("SELECT COUNT(*) FROM mk9_bdm_profiles WHERE status='pending'"),
                'approved'   => Database::count("SELECT COUNT(*) FROM mk9_bdm_profiles WHERE status='approved'"),
                'rejected'   => Database::count("SELECT COUNT(*) FROM mk9_bdm_profiles WHERE status='rejected'"),
                'terminated' => Database::count("SELECT COUNT(*) FROM mk9_bdm_profiles WHERE status='terminated'"),
            ],
        ]);
    }

    private static function clients(string $filter): void {
        $where  = $filter !== 'all' ? "WHERE status = ?" : "WHERE 1";
        $params = $filter !== 'all' ? [$filter] : [];

        $items = Database::query("SELECT * FROM mk9_clients {$where} ORDER BY created_at DESC", $params);

        Auth::jsonSuccess([
            'items'  => $items,
            'counts' => [
                'all'      => Database::count("SELECT COUNT(*) FROM mk9_clients"),
                'pending'  => Database::count("SELECT COUNT(*) FROM mk9_clients WHERE status='pending'"),
                'approved' => Database::count("SELECT COUNT(*) FROM mk9_clients WHERE status='approved'"),
                'rejected' => Database::count("SELECT COUNT(*) FROM mk9_clients WHERE status='rejected'"),
            ],
        ]);
    }

    private static function projects(string $filter): void {
        $where  = $filter !== 'all' ? "WHERE p.status = ?" : "WHERE 1";
        $params = $filter !== 'all' ? [$filter] : [];

        $items = Database::query(
            "SELECT p.*, pr.full_name as bdm_name FROM mk9_projects p
             LEFT JOIN mk9_bdm_profiles pr ON pr.user_id = p.bdm_user_id
             {$where} ORDER BY p.created_at DESC",
            $params
        );

        Auth::jsonSuccess([
            'items'  => $items,
            'counts' => [
                'all'       => Database::count("SELECT COUNT(*) FROM mk9_projects"),
                'pending'   => Database::count("SELECT COUNT(*) FROM mk9_projects WHERE status='pending'"),
                'ongoing'   => Database::count("SELECT COUNT(*) FROM mk9_projects WHERE status='ongoing'"),
                'on-hold'   => Database::count("SELECT COUNT(*) FROM mk9_projects WHERE status='on-hold'"),
                'completed' => Database::count("SELECT COUNT(*) FROM mk9_projects WHERE status='completed'"),
            ],
        ]);
    }

    private static function changes(string $filter): void {
        $where  = $filter !== 'all' ? "WHERE cr.status = ?" : "WHERE 1";
        $params = $filter !== 'all' ? [$filter] : [];

        $rawItems = Database::query(
            "SELECT cr.*, p.full_name as bdm_name, p.bdm_code FROM mk9_change_requests cr
             LEFT JOIN mk9_bdm_profiles p ON p.user_id = cr.bdm_user_id
             {$where} ORDER BY cr.created_at DESC",
            $params
        );

        $items = array_map(function($row) {
            if ($row->field_name === 'cnic_number') {
                if (!empty($row->old_value)) {
                    $dec = FileHandler::decryptField(base64_decode($row->old_value));
                    if ($dec !== '') {
                        $row->old_value = $dec;
                    } else {
                        $decRaw = FileHandler::decryptField($row->old_value);
                        if ($decRaw !== '') {
                            $row->old_value = $decRaw;
                        }
                    }
                }
                if (!empty($row->new_value)) {
                    $dec = FileHandler::decryptField(base64_decode($row->new_value));
                    if ($dec !== '') {
                        $row->new_value = $dec;
                    }
                }
            }
            return $row;
        }, $rawItems);

        Auth::jsonSuccess([
            'items'  => $items,
            'counts' => [
                'all'      => Database::count("SELECT COUNT(*) FROM mk9_change_requests"),
                'pending'  => Database::count("SELECT COUNT(*) FROM mk9_change_requests WHERE status='pending'"),
                'approved' => Database::count("SELECT COUNT(*) FROM mk9_change_requests WHERE status='approved'"),
                'rejected' => Database::count("SELECT COUNT(*) FROM mk9_change_requests WHERE status='rejected'"),
            ],
        ]);
    }

    private static function leaderboard(): void {
        $items = Database::query(
            "SELECT p.id, p.full_name, p.bdm_code, p.status, u.email,
             (SELECT COUNT(*) FROM mk9_projects proj WHERE proj.bdm_user_id = p.user_id AND proj.status IN ('ongoing', 'completed')) as project_score
             FROM mk9_bdm_profiles p
             JOIN users u ON u.id = p.user_id
             WHERE p.status = 'approved'
             ORDER BY project_score DESC, p.created_at ASC"
        );

        Auth::jsonSuccess([
            'items' => $items
        ]);
    }

    public static function approveBDM(int $id, string $notes): void {
        Auth::requireAjaxAdmin();
        $profile = Database::row("SELECT * FROM mk9_bdm_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = ?", [$id]);
        if (!$profile) Auth::jsonError('BDM not found.');

        $code = BDMCode::assign((int) $profile->user_id);
        Database::update('mk9_bdm_profiles', [
            'status'      => 'approved',
            'admin_notes' => htmlspecialchars($notes, ENT_QUOTES, 'UTF-8'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ], ['id' => $id]);

        Mailer::bdmApproved($profile->email, $profile->full_name, $code);
        Database::insert('mk9_activity_log', ['user_id' => 0, 'action' => 'bdm_approved', 'details' => $profile->full_name . ' approved with code ' . $code . '.', 'created_at' => date('Y-m-d H:i:s')]);
        Auth::jsonSuccess(['message' => 'BDM approved and code ' . $code . ' assigned.']);
    }

    public static function rejectBDM(int $id, string $notes): void {
        Auth::requireAjaxAdmin();
        $profile = Database::row("SELECT p.*, u.email FROM mk9_bdm_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = ?", [$id]);
        if (!$profile) Auth::jsonError('BDM not found.');

        Database::update('mk9_bdm_profiles', [
            'status'      => 'rejected',
            'admin_notes' => htmlspecialchars($notes, ENT_QUOTES, 'UTF-8'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ], ['id' => $id]);

        Mailer::bdmRejected($profile->email, $profile->full_name, $notes);
        Auth::jsonSuccess(['message' => 'BDM application rejected.']);
    }

    public static function approveClient(int $id, string $notes): void {
        Auth::requireAjaxAdmin();
        $client = Database::row("SELECT * FROM mk9_clients WHERE id = ?", [$id]);
        if (!$client) Auth::jsonError('Client not found.');

        Database::update('mk9_clients', [
            'status'      => 'approved',
            'admin_notes' => htmlspecialchars($notes, ENT_QUOTES, 'UTF-8'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ], ['id' => $id]);

        $projectId = Client::createProject($id);
        Mailer::clientApproved($client->contact_email, $client->organization_name);
        Auth::jsonSuccess(['message' => 'Client approved and project #' . $projectId . ' created.']);
    }

    public static function rejectClient(int $id, string $notes): void {
        Auth::requireAjaxAdmin();
        $client = Database::row("SELECT * FROM mk9_clients WHERE id = ?", [$id]);
        if (!$client) Auth::jsonError('Client not found.');

        Database::update('mk9_clients', [
            'status'      => 'rejected',
            'admin_notes' => htmlspecialchars($notes, ENT_QUOTES, 'UTF-8'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ], ['id' => $id]);

        Mailer::clientRejected($client->contact_email, $client->organization_name, $notes);
        Auth::jsonSuccess(['message' => 'Client application rejected.']);
    }

    public static function updateProject(int $id, string $status, string $notes): void {
        Auth::requireAjaxAdmin();
        $allowed = ['pending', 'ongoing', 'completed', 'on-hold'];
        if (!in_array($status, $allowed, true)) Auth::jsonError('Invalid status.');

        Database::update('mk9_projects', [
            'status'     => $status,
            'notes'      => htmlspecialchars($notes, ENT_QUOTES, 'UTF-8'),
            'updated_at' => date('Y-m-d H:i:s'),
        ], ['id' => $id]);

        Auth::jsonSuccess(['message' => 'Project status updated to ' . $status . '.']);
    }

    public static function approveChange(int $id, string $notes): void {
        Auth::requireAjaxAdmin();
        $cr = Database::row("SELECT * FROM mk9_change_requests WHERE id = ?", [$id]);
        if (!$cr) Auth::jsonError('Change request not found.');

        ChangeRequest::applyApproved($id);
        Database::update('mk9_change_requests', [
            'status'      => 'approved',
            'admin_notes' => htmlspecialchars($notes, ENT_QUOTES, 'UTF-8'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ], ['id' => $id]);

        Auth::jsonSuccess(['message' => 'Change request approved and applied.']);
    }

    public static function rejectChange(int $id, string $notes): void {
        Auth::requireAjaxAdmin();
        Database::update('mk9_change_requests', [
            'status'      => 'rejected',
            'admin_notes' => htmlspecialchars($notes, ENT_QUOTES, 'UTF-8'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ], ['id' => $id]);

        Auth::jsonSuccess(['message' => 'Change request rejected.']);
    }

    public static function editBDM(int $id, array $data): void {
        Auth::requireAjaxAdmin();
        $profile = Database::row("SELECT * FROM mk9_bdm_profiles WHERE id = ?", [$id]);
        if (!$profile) Auth::jsonError('BDM not found.');

        // Update profile fields
        $profileUpdates = [];
        if (isset($data['full_name']))   $profileUpdates['full_name']   = htmlspecialchars(trim($data['full_name']),   ENT_QUOTES, 'UTF-8');
        if (isset($data['father_name'])) $profileUpdates['father_name'] = htmlspecialchars(trim($data['father_name']), ENT_QUOTES, 'UTF-8');
        if (isset($data['phone']))       $profileUpdates['phone']       = htmlspecialchars(trim($data['phone']),       ENT_QUOTES, 'UTF-8');

        // ── FIX 8: BDM Code strict uniqueness (all statuses, incl. terminated) ──
        if (isset($data['bdm_code']) && trim($data['bdm_code']) !== '') {
            $newCode = strtoupper(htmlspecialchars(trim($data['bdm_code']), ENT_QUOTES, 'UTF-8'));
            $oldCode = $profile->bdm_code ?? '';

            if ($newCode !== $oldCode) {
                // Check mk9_bdm_profiles — any BDM (active, pending, rejected, terminated)
                $codeTaken = Database::row(
                    "SELECT id FROM mk9_bdm_profiles WHERE bdm_code = ? AND id != ?",
                    [$newCode, $id]
                );
                // Also check mk9_bdm_codes history table
                if (!$codeTaken) {
                    $codeTaken = Database::row(
                        "SELECT id FROM mk9_bdm_codes WHERE code = ?",
                        [$newCode]
                    );
                }
                if ($codeTaken) {
                    Auth::jsonError('This code has already been assigned and cannot be reused.');
                }

                $profileUpdates['bdm_code'] = $newCode;

                // Cascade: update mk9_bdm_codes table
                Database::run(
                    "UPDATE mk9_bdm_codes SET code = ?, updated_at = ? WHERE bdm_user_id = ?",
                    [$newCode, date('Y-m-d H:i:s'), $profile->user_id]
                );

                // Cascade: update mk9_clients (bdm_code column)
                Database::run(
                    "UPDATE mk9_clients SET bdm_code = ?, updated_at = ? WHERE bdm_code = ?",
                    [$newCode, date('Y-m-d H:i:s'), $oldCode]
                );

                // Cascade: update mk9_projects (bdm_code column if it exists)
                try {
                    Database::run(
                        "UPDATE mk9_projects SET bdm_code = ?, updated_at = ? WHERE bdm_code = ?",
                        [$newCode, date('Y-m-d H:i:s'), $oldCode]
                    );
                } catch (\Throwable $e) { /* column may not exist in all schemas */ }
            }
        }

        if (!empty($profileUpdates)) {
            $profileUpdates['updated_at'] = date('Y-m-d H:i:s');
            Database::update('mk9_bdm_profiles', $profileUpdates, ['id' => $id]);

            if (isset($profileUpdates['full_name'])) {
                Database::update('users', ['full_name' => $profileUpdates['full_name']], ['id' => $profile->user_id]);
            }
        }

        // Update email in users table if provided
        if (!empty($data['email'])) {
            $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) Auth::jsonError('Invalid email format.');

            // Check for duplicate
            $exists = Database::row("SELECT id FROM users WHERE email = ? AND id != ?", [$email, $profile->user_id]);
            if ($exists) Auth::jsonError('Email is already taken by another user.');

            Database::update('users', ['email' => $email], ['id' => $profile->user_id]);
        }

        // Update password if provided
        if (!empty($data['new_password'])) {
            $pw = $data['new_password'];
            if (strlen($pw) < 8) Auth::jsonError('Password must be at least 8 characters.');
            Database::update('users', [
                'password'   => password_hash($pw, PASSWORD_BCRYPT),
                'updated_at' => date('Y-m-d H:i:s'),
            ], ['id' => $profile->user_id]);
        }

        Auth::jsonSuccess(['message' => 'BDM profile updated successfully.']);
    }

    /**
     * Full BDM edit called from the admin-view dashboard.
     * Accepts bdm_user_id (from the impersonation session target) instead of profile row id.
     */
    public static function editBDMByUserId(int $userId, array $data): void {
        Auth::requireAjaxAdmin();
        $profile = Database::row("SELECT * FROM mk9_bdm_profiles WHERE user_id = ?", [$userId]);
        if (!$profile) Auth::jsonError('BDM profile not found.');

        $profileUpdates = [];
        if (isset($data['full_name']))   $profileUpdates['full_name']   = htmlspecialchars(trim($data['full_name']),   ENT_QUOTES, 'UTF-8');
        if (isset($data['father_name'])) $profileUpdates['father_name'] = htmlspecialchars(trim($data['father_name']), ENT_QUOTES, 'UTF-8');
        if (isset($data['phone']))       $profileUpdates['phone']       = htmlspecialchars(trim($data['phone']),       ENT_QUOTES, 'UTF-8');
        if (isset($data['bdm_code']))    $profileUpdates['bdm_code']    = strtoupper(htmlspecialchars(trim($data['bdm_code']), ENT_QUOTES, 'UTF-8'));
        if (isset($data['admin_notes'])) $profileUpdates['admin_notes'] = htmlspecialchars(trim($data['admin_notes']), ENT_QUOTES, 'UTF-8');
        if (!empty($profileUpdates)) {
            $profileUpdates['updated_at'] = date('Y-m-d H:i:s');
            Database::update('mk9_bdm_profiles', $profileUpdates, ['user_id' => $userId]);
            if (isset($profileUpdates['full_name'])) {
                Database::update('users', ['full_name' => $profileUpdates['full_name']], ['id' => $userId]);
            }
            // Keep mk9_bdm_codes in sync if code changed
            if (isset($profileUpdates['bdm_code'])) {
                Database::run("UPDATE mk9_bdm_codes SET code = ? WHERE bdm_user_id = ?",
                    [$profileUpdates['bdm_code'], $userId]);
            }
        }

        if (!empty($data['email'])) {
            $email = filter_var(trim($data['email']), FILTER_VALIDATE_EMAIL);
            if (!$email) Auth::jsonError('Invalid email format.');
            $dup = Database::row("SELECT id FROM users WHERE email = ? AND id != ?", [$email, $userId]);
            if ($dup) Auth::jsonError('Email already taken by another user.');
            Database::update('users', ['email' => $email, 'updated_at' => date('Y-m-d H:i:s')], ['id' => $userId]);
        }

        if (!empty($data['new_password'])) {
            $pw = $data['new_password'];
            if (strlen($pw) < 8) Auth::jsonError('New password must be at least 8 characters.');
            Database::update('users', [
                'password'   => password_hash($pw, PASSWORD_BCRYPT),
                'updated_at' => date('Y-m-d H:i:s'),
            ], ['id' => $userId]);
        }

        Auth::jsonSuccess(['message' => 'BDM updated successfully.']);
    }

    /**
     * Edit a project's full details from the admin-view dashboard.
     * Handles both mk9_projects (ongoing/completed) and mk9_clients (pending/rejected) rows.
     */
    public static function editProjectFromDashboard(int $id, string $table, array $data): void {
        Auth::requireAjaxAdmin();
        $allowed_tables = ['mk9_projects', 'mk9_clients'];
        if (!in_array($table, $allowed_tables, true)) Auth::jsonError('Invalid table.');

        $updates = [];
        if (isset($data['organization_name']))   $updates['organization_name']   = htmlspecialchars(trim($data['organization_name']),   ENT_QUOTES, 'UTF-8');
        if (isset($data['service_required']))    $updates['service_required']    = htmlspecialchars(trim($data['service_required']),    ENT_QUOTES, 'UTF-8');
        if (isset($data['notes']))               $updates['notes']               = htmlspecialchars(trim($data['notes']),               ENT_QUOTES, 'UTF-8');
        if (isset($data['admin_notes']))         $updates['admin_notes']         = htmlspecialchars(trim($data['admin_notes']),         ENT_QUOTES, 'UTF-8');

        // mk9_clients extra fields
        if ($table === 'mk9_clients') {
            if (isset($data['contact_name']))        $updates['contact_name']        = htmlspecialchars(trim($data['contact_name']),        ENT_QUOTES, 'UTF-8');
            if (isset($data['contact_email'])) {
                $ce = filter_var(trim($data['contact_email']), FILTER_VALIDATE_EMAIL);
                if ($ce) $updates['contact_email'] = $ce;
            }
            if (isset($data['contact_phone']))       $updates['contact_phone']       = htmlspecialchars(trim($data['contact_phone']),       ENT_QUOTES, 'UTF-8');
            if (isset($data['website']))             $updates['website']             = htmlspecialchars(trim($data['website']),             ENT_QUOTES, 'UTF-8');
            if (isset($data['budget']))              $updates['budget']              = htmlspecialchars(trim($data['budget']),              ENT_QUOTES, 'UTF-8');
            if (isset($data['timeline']))            $updates['timeline']            = htmlspecialchars(trim($data['timeline']),            ENT_QUOTES, 'UTF-8');
            if (isset($data['project_description'])) $updates['project_description'] = htmlspecialchars(trim($data['project_description']), ENT_QUOTES, 'UTF-8');
            if (isset($data['competitors']))         $updates['competitors']         = htmlspecialchars(trim($data['competitors']),         ENT_QUOTES, 'UTF-8');
        }

        // Status update for mk9_projects
        if ($table === 'mk9_projects' && !empty($data['status'])) {
            $allowed_statuses = ['pending', 'ongoing', 'completed', 'on-hold'];
            if (in_array($data['status'], $allowed_statuses, true)) {
                $updates['status'] = $data['status'];
            }
        }

        if (empty($updates)) Auth::jsonError('No changes provided.');
        $updates['updated_at'] = date('Y-m-d H:i:s');
        Database::update($table, $updates, ['id' => $id]);
        Auth::jsonSuccess(['message' => 'Record updated successfully.']);
    }

    public static function editClient(int $id, array $data): void {
        Auth::requireAjaxAdmin();
        $client = Database::row("SELECT * FROM mk9_clients WHERE id = ?", [$id]);
        if (!$client) Auth::jsonError('Client not found.');

        $updates = [];
        if (isset($data['organization_name'])) $updates['organization_name'] = htmlspecialchars(trim($data['organization_name']), ENT_QUOTES, 'UTF-8');
        if (isset($data['contact_name'])) $updates['contact_name'] = htmlspecialchars(trim($data['contact_name']), ENT_QUOTES, 'UTF-8');
        if (isset($data['contact_email'])) $updates['contact_email'] = filter_var($data['contact_email'], FILTER_SANITIZE_EMAIL);
        if (isset($data['contact_phone'])) $updates['contact_phone'] = htmlspecialchars(trim($data['contact_phone']), ENT_QUOTES, 'UTF-8');
        if (isset($data['website'])) $updates['website'] = htmlspecialchars(trim($data['website']), ENT_QUOTES, 'UTF-8');
        if (isset($data['service_required'])) $updates['service_required'] = htmlspecialchars(trim($data['service_required']), ENT_QUOTES, 'UTF-8');
        if (isset($data['timeline'])) $updates['timeline'] = htmlspecialchars(trim($data['timeline']), ENT_QUOTES, 'UTF-8');
        if (isset($data['budget'])) $updates['budget'] = htmlspecialchars(trim($data['budget']), ENT_QUOTES, 'UTF-8');
        if (isset($data['project_description'])) $updates['project_description'] = htmlspecialchars(trim($data['project_description']), ENT_QUOTES, 'UTF-8');
        if (isset($data['competitors'])) $updates['competitors'] = htmlspecialchars(trim($data['competitors']), ENT_QUOTES, 'UTF-8');
        
        if (!empty($updates)) {
            $updates['updated_at'] = date('Y-m-d H:i:s');
            Database::update('mk9_clients', $updates, ['id' => $id]);
        }

        Auth::jsonSuccess(['message' => 'Client updated successfully.']);
    }

    /**
     * Lay off (remove) a BDM.
     *
     * mode = 'soft'  → marks profile as terminated, deactivates BDM code,
     *                   invalidates their login (changes password to a locked hash),
     *                   keeps all project/client records intact for history.
     *
     * mode = 'hard'  → completely wipes the BDM: deletes user account, profile,
     *                   BDM codes, change requests, and encrypted document files.
     *                   Projects and clients are ORPHANED (bdm_user_id set to NULL)
     *                   so client data is preserved.
     */
    public static function layoffBDM(int $id, string $mode, string $reason): void {
        Auth::requireAjaxAdmin();

        // $id here is the mk9_bdm_profiles.id (row id, not user_id)
        $profile = Database::row(
            "SELECT p.*, u.email FROM mk9_bdm_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = ?",
            [$id]
        );
        if (!$profile) Auth::jsonError('BDM not found.');

        $userId   = (int) $profile->user_id;
        $name     = $profile->full_name;
        $reason   = htmlspecialchars(trim($reason), ENT_QUOTES, 'UTF-8');
        $now      = date('Y-m-d H:i:s');

        if ($mode === 'soft') {
            // 1. Mark profile as terminated (we extend the ENUM via ALTER in install.php)
            //    Since MySQL won't let us use 'terminated' on the current ENUM,
            //    we repurpose 'rejected' with an admin_notes flag, OR we do it cleanly
            //    by altering the ENUM. We do it via a direct run() call that works
            //    regardless of whether the column has been altered yet.
            try {
                Database::run(
                    "UPDATE mk9_bdm_profiles SET status = 'terminated', admin_notes = ?, updated_at = ? WHERE id = ?",
                    ["LAID OFF: $reason", $now, $id]
                );
            } catch (\Throwable $e) {
                // Fallback: ENUM doesn't have 'terminated' yet, use 'rejected' with notes
                Database::update('mk9_bdm_profiles', [
                    'status'      => 'rejected',
                    'admin_notes' => "LAID OFF: $reason",
                    'updated_at'  => $now,
                ], ['id' => $id]);
            }

            // 2. Deactivate their BDM code so no new clients can use it
            Database::run(
                "UPDATE mk9_bdm_codes SET status = 'inactive', updated_at = ? WHERE bdm_user_id = ?",
                [$now, $userId]
            );

            // 3. Lock the user account (set password to an impossible hash)
            Database::update('users', [
                'password'   => '!LOCKED!' . bin2hex(random_bytes(16)),
                'updated_at' => $now,
            ], ['id' => $userId]);

            // 4. Log the action
            Database::insert('mk9_activity_log', [
                'user_id'    => 0,
                'action'     => 'bdm_laid_off',
                'details'    => "$name (ID $userId) laid off (soft). Reason: $reason",
                'created_at' => $now,
            ]);

            Auth::jsonSuccess(['message' => "$name has been laid off. Their account is locked and BDM code deactivated. All project records are preserved."]);

        } elseif ($mode === 'hard') {
            // 1. Collect encrypted file paths to delete BEFORE removing DB rows
            $filesToDelete = array_filter([
                $profile->university_card_front,
                $profile->university_card_back,
                $profile->profile_picture,
            ]);

            // 2. Orphan projects and clients (preserve data, just remove the link)
            Database::run(
                "UPDATE mk9_projects SET bdm_user_id = NULL, updated_at = ? WHERE bdm_user_id = ?",
                [$now, $userId]
            );
            Database::run(
                "UPDATE mk9_clients SET bdm_user_id = NULL, updated_at = ? WHERE bdm_user_id = ?",
                [$now, $userId]
            );

            // 3. Delete change requests
            Database::run("DELETE FROM mk9_change_requests WHERE bdm_user_id = ?", [$userId]);

            // 4. Delete BDM codes
            Database::run("DELETE FROM mk9_bdm_codes WHERE bdm_user_id = ?", [$userId]);

            // 5. Delete BDM profile
            Database::run("DELETE FROM mk9_bdm_profiles WHERE id = ?", [$id]);

            // 6. Delete user account
            Database::run("DELETE FROM users WHERE id = ?", [$userId]);

            // 7. Delete encrypted files from disk
            foreach ($filesToDelete as $filePath) {
                if ($filePath) FileHandler::delete($filePath);
            }

            // 8. Log the action
            Database::insert('mk9_activity_log', [
                'user_id'    => 0,
                'action'     => 'bdm_hard_removed',
                'details'    => "$name (ID $userId) permanently removed. Reason: $reason",
                'created_at' => $now,
            ]);

            Auth::jsonSuccess(['message' => "$name has been permanently removed from the system. All their data and documents have been deleted."]);

        } else {
            Auth::jsonError('Invalid removal mode. Use "soft" or "hard".');
        }
    }

    public static function sendWelcomeEmail(int $id): void {
        Auth::requireAjaxAdmin();
        $profile = Database::row(
            "SELECT p.*, u.email FROM mk9_bdm_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = ?",
            [$id]
        );
        if (!$profile) Auth::jsonError('BDM not found.');

        $sent = Mailer::sendWelcomeEmail($profile->email, $profile->full_name);
        if ($sent) {
            Database::insert('mk9_activity_log', [
                'user_id'    => 0,
                'action'     => 'bdm_welcome_email_sent',
                'details'    => 'Welcome email sent to ' . $profile->full_name . ' (' . $profile->email . ').',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            Auth::jsonSuccess(['message' => 'Welcome email sent to ' . $profile->full_name . ' (' . $profile->email . ').']);
        } else {
            Auth::jsonError('Failed to send email. Please check your server mail configuration.');
        }
    }

    public static function sendCustomEmail(int $id, string $subject, string $message): void {
        Auth::requireAjaxAdmin();
        if (!$subject || !$message) Auth::jsonError('Subject and message are required.');
        $profile = Database::row("SELECT p.*, u.email FROM mk9_bdm_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = ?", [$id]);
        if (!$profile) Auth::jsonError('BDM not found.');

        $sent = Mailer::sendCustomEmail($profile->email, $profile->full_name, $subject, $message);
        if ($sent) {
            Database::insert('mk9_activity_log', [
                'user_id'    => 0,
                'action'     => 'custom_email_sent',
                'details'    => 'Custom email sent to ' . $profile->full_name . ' (' . $profile->email . '). Subject: ' . $subject,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            Auth::jsonSuccess(['message' => 'Email sent to ' . $profile->email . ' successfully.']);
        } else {
            Auth::jsonError('Failed to send email. Check server mail config.');
        }
    }

    public static function syncSheets(): void {
        Auth::requireAjaxAdmin();

        if (!defined('GOOGLE_SHEETS_URL') || trim(GOOGLE_SHEETS_URL) === '') {
            Auth::jsonError('Google Sheets Sync URL is not configured in config/config.php.');
        }

        try {
            // 1. Fetch and Decrypt BDMs
            $rawBdms = Database::query(
                "SELECT p.id, p.full_name, p.father_name, p.phone, p.bdm_code, p.cnic_number, 
                        p.status, p.can_edit, p.admin_notes, p.created_at, p.updated_at,
                        u.email
                 FROM mk9_bdm_profiles p
                 JOIN users u ON u.id = p.user_id
                 ORDER BY p.id ASC"
            );
            $bdms = array_map(function($row) {
                if (!empty($row->cnic_number)) {
                    $row->cnic_number = FileHandler::decryptField($row->cnic_number);
                }
                return $row;
            }, $rawBdms);

            // 2. Fetch Clients
            $clients = Database::query("SELECT * FROM mk9_clients ORDER BY id ASC");

            // 3. Fetch Projects
            $projects = Database::query(
                "SELECT p.*, pr.full_name as bdm_name, pr.bdm_code 
                 FROM mk9_projects p
                 LEFT JOIN mk9_bdm_profiles pr ON pr.user_id = p.bdm_user_id
                 ORDER BY p.id ASC"
            );

            // 4. Fetch Activity Logs
            $logs = Database::query(
                "SELECT l.id, l.action, l.details, l.created_at, u.email as user_email
                 FROM mk9_activity_log l
                 LEFT JOIN users u ON u.id = l.user_id
                 ORDER BY l.id DESC"
            );

            $payload = [
                'bdms'         => $bdms,
                'clients'      => $clients,
                'projects'     => $projects,
                'activity_log' => $logs
            ];

            // 5. POST to Google Sheet Web App (with manual redirect handling for open_basedir compatibility)
            $ch = curl_init(GOOGLE_SHEETS_URL);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Prevent issues with local SSL certs
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
            curl_setopt($ch, CURLOPT_HEADER, true);

            $response = curl_exec($ch);
            $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

            $redirects = 0;
            while (in_array($statusCode, [301, 302, 303, 307, 308]) && $redirects < 5) {
                $redirects++;
                $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
                $headers = substr($response, 0, $headerSize);
                preg_match('/Location:(.*?)\n/i', $headers, $matches);
                if (empty($matches[1])) {
                    break;
                }
                $newUrl = trim($matches[1]);

                curl_close($ch);
                $ch = curl_init($newUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_HEADER, true);

                $response = curl_exec($ch);
                $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            }

            if (curl_errno($ch)) {
                $err = curl_error($ch);
                curl_close($ch);
                throw new Exception('cURL error: ' . $err);
            }

            $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $body = substr($response, $headerSize);
            curl_close($ch);

            if ($statusCode !== 200) {
                throw new Exception('Google Script returned status code ' . $statusCode . '. Response: ' . substr($body, 0, 500));
            }

            $resData = json_decode($body, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid response format from Google Script. Response: ' . substr($body, 0, 500));
            }

            if (!empty($resData['success'])) {
                Auth::jsonSuccess(['message' => 'Database successfully synced and backed up to Google Sheet!']);
            } else {
                throw new Exception($resData['error'] ?? 'Unknown error occurred during sheet sync.');
            }

        } catch (Throwable $e) {
            Auth::jsonError('Sync failed: ' . $e->getMessage());
        }
    }
}

