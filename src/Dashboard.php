<?php
class Dashboard {
    public static function getData(): void {
        Auth::verifyCsrf();
        Auth::requireAjaxAuth();

        // If admin is impersonating a BDM, load that BDM's data
        $userId = Auth::isImpersonating()
            ? Auth::impersonatedBdmId()
            : Auth::userId();

        $profile = BDM::getProfile($userId);
        if (!$profile) Auth::jsonError('Profile not found.');

        // Get the BDM code (may be null if not yet assigned)
        $bdmCode = BDMCode::getByUser($userId);

        // ── Pending & Rejected leads from mk9_clients ────────────────
        // These are clients submitted using the BDM's code/id but not yet turned into projects
        if ($bdmCode !== null && $bdmCode !== '') {
            $pendingLeads = Database::query(
                "SELECT id, organization_name, service_required, contact_name, contact_email,
                        budget, timeline, admin_notes, created_at, status
                 FROM mk9_clients
                 WHERE (bdm_user_id = ? OR bdm_code = ?)
                   AND status = 'pending'
                 ORDER BY created_at DESC",
                [$userId, $bdmCode]
            );
            $rejectedLeads = Database::query(
                "SELECT id, organization_name, service_required, contact_name, contact_email,
                        budget, timeline, admin_notes, created_at, status
                 FROM mk9_clients
                 WHERE (bdm_user_id = ? OR bdm_code = ?)
                   AND status = 'rejected'
                 ORDER BY created_at DESC",
                [$userId, $bdmCode]
            );
        } else {
            // BDM has no code yet (not approved), only match by user_id
            $pendingLeads = Database::query(
                "SELECT id, organization_name, service_required, contact_name, contact_email,
                        budget, timeline, admin_notes, created_at, status
                 FROM mk9_clients
                 WHERE bdm_user_id = ?
                   AND status = 'pending'
                 ORDER BY created_at DESC",
                [$userId]
            );
            $rejectedLeads = Database::query(
                "SELECT id, organization_name, service_required, contact_name, contact_email,
                        budget, timeline, admin_notes, created_at, status
                 FROM mk9_clients
                 WHERE bdm_user_id = ?
                   AND status = 'rejected'
                 ORDER BY created_at DESC",
                [$userId]
            );
        }

        // ── Approved projects from mk9_projects ──────────────────────
        // These are created when admin approves a client
        if ($bdmCode !== null && $bdmCode !== '') {
            $projects = Database::query(
                "SELECT p.id, p.organization_name, p.service_required, p.status, p.notes, p.created_at, c.budget
                 FROM mk9_projects p
                 LEFT JOIN mk9_clients c ON c.id = p.client_id
                 WHERE (p.bdm_user_id = ? OR p.bdm_code = ?)
                 ORDER BY p.created_at DESC",
                [$userId, $bdmCode]
            );
        } else {
            $projects = Database::query(
                "SELECT p.id, p.organization_name, p.service_required, p.status, p.notes, p.created_at, c.budget
                 FROM mk9_projects p
                 LEFT JOIN mk9_clients c ON c.id = p.client_id
                 WHERE p.bdm_user_id = ?
                 ORDER BY p.created_at DESC",
                [$userId]
            );
        }

        $grouped = [
            'pending'   => $pendingLeads,
            'ongoing'   => [],
            'completed' => [],
            'rejected'  => $rejectedLeads,
        ];

        foreach ($projects as $p) {
            $s = $p->status ?? 'ongoing';
            if ($s === 'ongoing' || $s === 'on-hold') {
                $grouped['ongoing'][] = $p;
            } elseif ($s === 'completed') {
                $grouped['completed'][] = $p;
            } elseif ($s === 'pending') {
                // Projects in mk9_projects with status 'pending' also show in pending
                $grouped['pending'][] = $p;
            }
        }

        $counts = [
            'total'     => count($grouped['pending']) + count($grouped['rejected']) + count($grouped['ongoing']) + count($grouped['completed']),
            'pending'   => count($grouped['pending']),
            'ongoing'   => count($grouped['ongoing']),
            'completed' => count($grouped['completed']),
            'rejected'  => count($grouped['rejected']),
        ];

        Auth::jsonSuccess([
            'profile' => [
                'profile_id'      => $profile->id,
                'user_id'         => $profile->user_id,
                'name'            => $profile->full_name,
                'email'           => $profile->email,
                'phone'           => $profile->phone,
                'father_name'     => $profile->father_name,
                'bdm_code'        => $bdmCode ?? '-',
                'can_edit'        => (bool) $profile->can_edit,
                'joined'          => $profile->created_at,
                'status'          => $profile->status,
                'admin_notes'     => $profile->admin_notes ?? '',
                'profile_picture' => $profile->profile_picture ?? '',
            ],
            'projects'        => $grouped,
            'counts'          => $counts,
            'change_requests' => ChangeRequest::getByBDM($userId),
        ]);
    }
}
