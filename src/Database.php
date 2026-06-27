<?php
class Database {
    public static function query(string $sql, array $params = []): array {
        $stmt = DB::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function row(string $sql, array $params = []): ?object {
        $stmt = DB::get()->prepare($sql);
        $stmt->execute($params);
        $r = $stmt->fetch();
        return $r ?: null;
    }

    public static function insert(string $table, array $data): int {
        $cols = implode(', ', array_keys($data));
        $ph = implode(', ', array_fill(0, count($data), '?'));
        $stmt = DB::get()->prepare("INSERT INTO {$table} ({$cols}) VALUES ({$ph})");
        $stmt->execute(array_values($data));
        return (int) DB::get()->lastInsertId();
    }

    public static function update(string $table, array $data, array $where): int {
        $set = implode(', ', array_map(fn($k) => "{$k} = ?", array_keys($data)));
        $wh = implode(' AND ', array_map(fn($k) => "{$k} = ?", array_keys($where)));
        $stmt = DB::get()->prepare("UPDATE {$table} SET {$set} WHERE {$wh}");
        $stmt->execute([...array_values($data), ...array_values($where)]);
        return $stmt->rowCount();
    }

    public static function run(string $sql, array $params = []): int {
        $stmt = DB::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public static function count(string $sql, array $params = []): int {
        $stmt = DB::get()->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    public static function scalar(string $sql, array $params = []): mixed {
        $stmt = DB::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    public static function delete(string $table, array $where): int {
        $wh = implode(' AND ', array_map(fn($k) => "{$k} = ?", array_keys($where)));
        $stmt = DB::get()->prepare("DELETE FROM {$table} WHERE {$wh}");
        $stmt->execute(array_values($where));
        return $stmt->rowCount();
    }
}
