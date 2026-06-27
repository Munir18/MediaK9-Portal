<?php
/**
 * Ticket.php - BDM Support Ticket System
 * Handles ticket creation (BDM), listing, and replies (BDM + Admin)
 */
class Ticket {

    private static function ensureTablesExist(): void {
        try {
            $exists = Database::scalar("SHOW TABLES LIKE 'mk9_tickets'");
            if (!$exists) {
                Database::run("CREATE TABLE IF NOT EXISTS `mk9_tickets` (
                    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    `bdm_user_id` INT UNSIGNED NOT NULL,
                    `subject`     VARCHAR(255) NOT NULL,
                    `category`    ENUM('general','technical','payment','account','other') NOT NULL DEFAULT 'general',
                    `status`      ENUM('open','in-progress','closed') NOT NULL DEFAULT 'open',
                    `created_at`  DATETIME NOT NULL,
                    `updated_at`  DATETIME NOT NULL,
                    INDEX `idx_bdm`    (`bdm_user_id`),
                    INDEX `idx_status` (`status`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

                Database::run("CREATE TABLE IF NOT EXISTS `mk9_ticket_replies` (
                    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    `ticket_id`   INT UNSIGNED NOT NULL,
                    `sender_id`   INT UNSIGNED NOT NULL,
                    `sender_role` ENUM('bdm','admin') NOT NULL DEFAULT 'bdm',
                    `message`     TEXT NOT NULL,
                    `is_read`     TINYINT(1) NOT NULL DEFAULT 0,
                    `created_at`  DATETIME NOT NULL,
                    INDEX `idx_ticket` (`ticket_id`),
                    INDEX `idx_sender` (`sender_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            }
        } catch (\Throwable $e) {
            // Ignore / swallow database connectivity or existence query errors
        }
    }

    // ── BDM: Submit a new ticket ────────────────────────────────────
    public static function create(array $post): void {
        self::ensureTablesExist();
        Auth::verifyCsrf();
        Auth::requireAjaxAuth();

        $userId   = Auth::userId();
        $subject  = htmlspecialchars(trim($post['subject'] ?? ''), ENT_QUOTES, 'UTF-8');
        $category = htmlspecialchars(trim($post['category'] ?? 'general'), ENT_QUOTES, 'UTF-8');
        $message  = htmlspecialchars(trim($post['message'] ?? ''), ENT_QUOTES, 'UTF-8');

        if (!$subject) Auth::jsonError('Please enter a subject for your ticket.');
        if (!$message) Auth::jsonError('Please describe your issue.');

        $allowedCategories = ['general', 'technical', 'payment', 'account', 'other'];
        if (!in_array($category, $allowedCategories, true)) {
            $category = 'general';
        }

        $ticketId = Database::insert('mk9_tickets', [
            'bdm_user_id' => $userId,
            'subject'     => $subject,
            'category'    => $category,
            'status'      => 'open',
            'created_at'  => date('Y-m-d H:i:s'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ]);

        // Insert the BDM's first message as a reply
        Database::insert('mk9_ticket_replies', [
            'ticket_id'  => $ticketId,
            'sender_id'  => $userId,
            'sender_role'=> 'bdm',
            'message'    => $message,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Notify admin by email
        $profile = BDM::getProfile($userId);
        $name    = $profile ? $profile->full_name : 'A BDM';
        Mailer::newTicket(MAIL_TO_ADMIN, $name, $subject, $category);

        Auth::jsonSuccess(['message' => 'Ticket submitted successfully. We will respond shortly.', 'ticket_id' => $ticketId]);
    }

    // ── BDM: Get all their own tickets ──────────────────────────────
    public static function getByBDM(): void {
        self::ensureTablesExist();
        Auth::requireAjaxAuth();
        $userId = Auth::userId();

        $tickets = Database::query(
            "SELECT t.*, 
                    (SELECT COUNT(*) FROM mk9_ticket_replies r WHERE r.ticket_id = t.id) AS reply_count,
                    (SELECT COUNT(*) FROM mk9_ticket_replies r WHERE r.ticket_id = t.id AND r.sender_role = 'admin' AND r.is_read = 0) AS unread_admin_replies
             FROM mk9_tickets t
             WHERE t.bdm_user_id = ?
             ORDER BY t.updated_at DESC",
            [$userId]
        );

        Auth::jsonSuccess(['tickets' => $tickets]);
    }

    // ── BDM/Admin: Get ticket details + all replies ─────────────────
    public static function getDetail(int $ticketId): void {
        self::ensureTablesExist();
        Auth::requireAjaxAuth();
        $userId  = Auth::userId();
        $isAdmin = Auth::isAdmin();

        $ticket = Database::row("SELECT t.*, p.full_name as bdm_name FROM mk9_tickets t LEFT JOIN mk9_bdm_profiles p ON p.user_id = t.bdm_user_id WHERE t.id = ?", [$ticketId]);
        if (!$ticket) Auth::jsonError('Ticket not found.');

        // BDMs can only see their own tickets
        if (!$isAdmin && $ticket->bdm_user_id != $userId) {
            Auth::jsonError('Access denied.');
        }

        $replies = Database::query(
            "SELECT r.*, u.full_name as sender_name FROM mk9_ticket_replies r 
             JOIN users u ON u.id = r.sender_id
             WHERE r.ticket_id = ? ORDER BY r.created_at ASC",
            [$ticketId]
        );

        // Mark admin replies as read when BDM views
        if (!$isAdmin) {
            Database::run(
                "UPDATE mk9_ticket_replies SET is_read = 1 WHERE ticket_id = ? AND sender_role = 'admin'",
                [$ticketId]
            );
        } else {
            // Mark BDM replies as read when admin views
            Database::run(
                "UPDATE mk9_ticket_replies SET is_read = 1 WHERE ticket_id = ? AND sender_role = 'bdm'",
                [$ticketId]
            );
        }

        Auth::jsonSuccess(['ticket' => $ticket, 'replies' => $replies]);
    }

    // ── BDM/Admin: Reply to a ticket ───────────────────────────────
    public static function reply(array $post): void {
        self::ensureTablesExist();
        Auth::verifyCsrf();
        Auth::requireAjaxAuth();

        $userId   = Auth::userId();
        $isAdmin  = Auth::isAdmin();
        $ticketId = (int) ($post['ticket_id'] ?? 0);
        $message  = htmlspecialchars(trim($post['message'] ?? ''), ENT_QUOTES, 'UTF-8');

        if (!$ticketId) Auth::jsonError('Invalid ticket.');
        if (!$message) Auth::jsonError('Reply message cannot be empty.');

        $ticket = Database::row("SELECT * FROM mk9_tickets WHERE id = ?", [$ticketId]);
        if (!$ticket) Auth::jsonError('Ticket not found.');

        // BDMs can only reply to their own tickets
        if (!$isAdmin && $ticket->bdm_user_id != $userId) {
            Auth::jsonError('Access denied.');
        }

        // Don't allow replies on closed tickets unless admin
        if ($ticket->status === 'closed' && !$isAdmin) {
            Auth::jsonError('This ticket is closed. Please open a new ticket if you need further help.');
        }

        $senderRole = $isAdmin ? 'admin' : 'bdm';

        Database::insert('mk9_ticket_replies', [
            'ticket_id'   => $ticketId,
            'sender_id'   => $userId,
            'sender_role' => $senderRole,
            'message'     => $message,
            'is_read'     => 0,
            'created_at'  => date('Y-m-d H:i:s'),
        ]);

        // Update ticket updated_at and possibly status
        $newStatus = $ticket->status;
        if ($isAdmin && $ticket->status === 'open') {
            $newStatus = 'in-progress';
        } elseif (!$isAdmin && $ticket->status === 'in-progress') {
            $newStatus = 'open'; // BDM re-opened by replying
        }

        Database::run(
            "UPDATE mk9_tickets SET updated_at = ?, status = ? WHERE id = ?",
            [date('Y-m-d H:i:s'), $newStatus, $ticketId]
        );

        // Send notification email
        if ($isAdmin) {
            // Notify BDM
            $bdmUser = Database::row("SELECT u.email, u.full_name FROM users u WHERE u.id = ?", [$ticket->bdm_user_id]);
            if ($bdmUser) {
                Mailer::ticketReply($bdmUser->email, $bdmUser->full_name, $ticket->subject, $message, false);
            }
        } else {
            // Notify admin
            $senderProfile = BDM::getProfile($userId);
            $name = $senderProfile ? $senderProfile->full_name : 'A BDM';
            Mailer::ticketReply(MAIL_TO_ADMIN, 'Admin', $ticket->subject, $message, true, $name);
        }

        Auth::jsonSuccess(['message' => 'Reply sent successfully.']);
    }

    // ── Admin: Update ticket status ─────────────────────────────────
    public static function updateStatus(int $ticketId, string $status): void {
        self::ensureTablesExist();
        Auth::requireAjaxAdmin();

        $allowed = ['open', 'in-progress', 'closed'];
        if (!in_array($status, $allowed, true)) Auth::jsonError('Invalid status.');

        $ticket = Database::row("SELECT * FROM mk9_tickets WHERE id = ?", [$ticketId]);
        if (!$ticket) Auth::jsonError('Ticket not found.');

        Database::run(
            "UPDATE mk9_tickets SET status = ?, updated_at = ? WHERE id = ?",
            [$status, date('Y-m-d H:i:s'), $ticketId]
        );

        // Notify BDM if ticket is closed
        if ($status === 'closed') {
            $bdmUser = Database::row("SELECT u.email, u.full_name FROM users u WHERE u.id = ?", [$ticket->bdm_user_id]);
            if ($bdmUser) {
                Mailer::ticketClosed($bdmUser->email, $bdmUser->full_name, $ticket->subject);
            }
        }

        Auth::jsonSuccess(['message' => 'Ticket status updated.']);
    }

    // ── Admin: Get all tickets ──────────────────────────────────────
    public static function getAllAdmin(string $filter = 'all'): void {
        self::ensureTablesExist();
        Auth::requireAjaxAdmin();

        $where  = $filter !== 'all' ? "WHERE t.status = ?" : "WHERE 1";
        $params = $filter !== 'all' ? [$filter] : [];

        $tickets = Database::query(
            "SELECT t.*, p.full_name as bdm_name, p.bdm_code,
                    (SELECT COUNT(*) FROM mk9_ticket_replies r WHERE r.ticket_id = t.id) AS reply_count,
                    (SELECT COUNT(*) FROM mk9_ticket_replies r WHERE r.ticket_id = t.id AND r.sender_role = 'bdm' AND r.is_read = 0) AS unread_bdm_replies
             FROM mk9_tickets t
             LEFT JOIN mk9_bdm_profiles p ON p.user_id = t.bdm_user_id
             {$where}
             ORDER BY t.updated_at DESC",
            $params
        );

        Auth::jsonSuccess([
            'items'  => $tickets,
            'counts' => [
                'all'         => Database::count("SELECT COUNT(*) FROM mk9_tickets"),
                'open'        => Database::count("SELECT COUNT(*) FROM mk9_tickets WHERE status='open'"),
                'in-progress' => Database::count("SELECT COUNT(*) FROM mk9_tickets WHERE status='in-progress'"),
                'closed'      => Database::count("SELECT COUNT(*) FROM mk9_tickets WHERE status='closed'"),
            ],
        ]);
    }
}
