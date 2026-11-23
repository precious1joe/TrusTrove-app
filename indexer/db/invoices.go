package db

import (
	"database/sql"
	"context"
	"fmt"
	"strings"
)

// GetInvoicesPageFiltered returns a paginated list of invoices matching the optional status, issuer, and asset filters.
func GetDB() *sql.DB {
	return globalDB
}

var globalDB *sql.DB

func SetDB(db *sql.DB) {
	globalDB = db
}

func GetInvoicesPageFiltered(ctx context.Context, status, issuer, asset string, limit, offset int) ([]*DbInvoice, int, error) {
	db := GetDB()
	if db == nil {
		return nil, 0, fmt.Errorf("database connection not initialized")
	}

	whereClauses := []string{"1=1"}
	var args []interface{}

	if status != "" {
		whereClauses = append(whereClauses, "status = ?")
		args = append(args, status)
	}
	if issuer != "" {
		whereClauses = append(whereClauses, "issuer = ?")
		args = append(args, issuer)
	}
	if asset != "" {
		whereClauses = append(whereClauses, "funding_asset = ?")
		args = append(args, asset)
	}

	whereStr := strings.Join(whereClauses, " AND ")

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM invoices WHERE %s", whereStr)
	var total int
	err := db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count invoices: %w", err)
	}

	query := fmt.Sprintf("SELECT id, issuer, funding_asset, amount, status, created_at FROM invoices WHERE %s ORDER BY created_at DESC LIMIT ? OFFSET ?", whereStr)
	queryArgs := append(append([]interface{}(nil), args...), limit, offset)

	rows, err := db.QueryContext(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query invoices: %w", err)
	}
	defer rows.Close()

	var invoices []*DbInvoice
	for rows.Next() {
		var inv DbInvoice
		if err := rows.Scan(&inv.ID, &inv.Issuer, &inv.FundingAsset, &inv.Amount, &inv.Status, &inv.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("failed to scan invoice: %w", err)
		}
		invoices = append(invoices, &inv)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("invoice rows iteration error: %w", err)
	}

	return invoices, total, nil
}
