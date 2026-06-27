<?php
ob_start();
// Suppress PHP notices/warnings that would corrupt JSON output
@ini_set('display_errors', 0);
error_reporting(0);

require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Auth.php';
require_once dirname(__DIR__) . '/src/FileHandler.php';
require_once dirname(__DIR__) . '/src/BDMCode.php';
require_once dirname(__DIR__) . '/src/BDM.php';
require_once dirname(__DIR__) . '/src/Client.php';
require_once dirname(__DIR__) . '/src/ChangeRequest.php';
require_once dirname(__DIR__) . '/src/Admin.php';
require_once dirname(__DIR__) . '/src/Mailer.php';
require_once dirname(__DIR__) . '/src/Ticket.php';

Auth::start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Auth::jsonError('Method not allowed.', 405);
}

Auth::requireAjaxAdmin();

try {
    $action = $_POST['action'] ?? '';
    $id     = (int) ($_POST['id'] ?? 0);
    $notes  = htmlspecialchars(trim($_POST['notes'] ?? ''), ENT_QUOTES, 'UTF-8');

    match ($action) {
        'mk9_admin_get_data' => Admin::getData(
            $_POST['tab'] ?? 'stats',
            $_POST['filter'] ?? 'all'
        ),

        'mk9_admin_approve_bdm'    => Admin::approveBDM($id, $notes),
        'mk9_admin_reject_bdm'     => Admin::rejectBDM($id, $notes),
        'mk9_admin_approve_client' => Admin::approveClient($id, $notes),
        'mk9_admin_reject_client'  => Admin::rejectClient($id, $notes),
        'mk9_admin_approve_change' => Admin::approveChange($id, $notes),
        'mk9_admin_reject_change'  => Admin::rejectChange($id, $notes),
        'mk9_admin_send_welcome_email' => Admin::sendWelcomeEmail($id),
        'mk9_admin_custom_email' => Admin::sendCustomEmail(
            $id,
            trim($_POST['subject'] ?? ''),
            trim($_POST['message'] ?? '')
        ),

        // ── Layoff / Remove BDM ────────────────────────────────────
        'mk9_admin_layoff_bdm' => Admin::layoffBDM(
            $id,
            htmlspecialchars(trim($_POST['mode'] ?? 'soft'), ENT_QUOTES, 'UTF-8'),
            $notes
        ),


        'mk9_admin_update_project' => Admin::updateProject(
            $id,
            $_POST['status'] ?? '',
            $notes
        ),

        'mk9_admin_edit_bdm' => Admin::editBDM($id, $_POST),
        'mk9_admin_edit_client' => Admin::editClient($id, $_POST),
        'mk9_admin_sync_sheets' => Admin::syncSheets(),

        // ── Admin editing from the impersonated BDM dashboard ──────────
        'mk9_admin_edit_bdm_dashboard' => Admin::editBDMByUserId(
            (int) ($_POST['user_id'] ?? 0),
            $_POST
        ),

        'mk9_admin_edit_project_dashboard' => Admin::editProjectFromDashboard(
            $id,
            $_POST['db_table'] ?? '',
            $_POST
        ),

        // ── BDM impersonation (admin silently edits a BDM dashboard) ──
        'mk9_admin_get_bdm_list' => (function () {
            $bdms = Database::query(
                "SELECT p.user_id, p.full_name, p.bdm_code
                 FROM mk9_bdm_profiles p
                 WHERE p.status = 'approved'
                 ORDER BY p.full_name ASC"
            );
            Auth::jsonSuccess(['bdms' => $bdms]);
        })(),

        'mk9_admin_impersonate_bdm' => (function () use ($id) {
            if (!$id) Auth::jsonError('No BDM ID provided.');
            $profile = Database::row("SELECT user_id, full_name, bdm_code FROM mk9_bdm_profiles WHERE user_id = ? AND status = 'approved'", [$id]);
            if (!$profile) Auth::jsonError('BDM not found or not approved.');
            Auth::startImpersonating((int) $profile->user_id);
            Auth::jsonSuccess([
                'message'  => 'Now viewing dashboard as ' . $profile->full_name,
                'redirect' => '/dashboard?admin_view=1',
                'bdm_name' => $profile->full_name,
                'bdm_code' => $profile->bdm_code,
            ]);
        })(),

        'mk9_admin_stop_impersonate' => (function () {
            Auth::stopImpersonating();
            Auth::jsonSuccess(['redirect' => '/admin']);
        })(),

        'mk9_admin_change_password' => (function () {
            Auth::verifyCsrf();
            $userId    = Auth::userId();
            $currentPw = $_POST['current_password'] ?? '';
            $newPw     = $_POST['new_password'] ?? '';
            $confirmPw = $_POST['confirm_password'] ?? '';

            if (!$currentPw || !$newPw || !$confirmPw) Auth::jsonError('All fields are required.');
            if ($newPw !== $confirmPw) Auth::jsonError('New passwords do not match.');

            $isStrong = strlen($newPw) >= 8
                && preg_match('/[A-Z]/', $newPw)
                && preg_match('/[a-z]/', $newPw)
                && preg_match('/[0-9]/', $newPw)
                && preg_match('/[^A-Za-z0-9]/', $newPw);

            if (!$isStrong) {
                Auth::jsonError('Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');
            }

            $user = Database::row("SELECT password FROM users WHERE id = ?", [$userId]);
            if (!$user || !password_verify($currentPw, $user->password)) {
                Auth::jsonError('Current password is incorrect.');
            }

            Database::run("UPDATE users SET password = ?, updated_at = ? WHERE id = ?",
                [password_hash($newPw, PASSWORD_BCRYPT), date('Y-m-d H:i:s'), $userId]
            );
            Auth::jsonSuccess(['message' => 'Admin password changed successfully.']);
        })(),

        // ── Ticket / Support (Admin) ──────────────────────────
        'mk9_admin_get_tickets'      => Ticket::getAllAdmin($_POST['filter'] ?? 'all'),
        'mk9_admin_ticket_detail'    => Ticket::getDetail((int) ($_POST['ticket_id'] ?? 0)),
        'mk9_admin_ticket_reply'     => Ticket::reply($_POST),
        'mk9_admin_ticket_status'    => Ticket::updateStatus($id, $_POST['status'] ?? ''),

        default => Auth::jsonError('Unknown admin action.', 400),
    };
} catch (Throwable $e) {
    Auth::jsonError('Server Error: ' . $e->getMessage());
}
