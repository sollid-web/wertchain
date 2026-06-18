export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      wc_admin_audit_log: {
        Row: {
          action_type: Database["public"]["Enums"]["admin_action_type"]
          admin_id: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          ip_address: unknown
          ledger_tx_id: string | null
          reason: string
          target_contract_id: string | null
          target_deposit_id: string | null
          target_migration_id: string | null
          target_user_id: string | null
          target_withdrawal_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["admin_action_type"]
          admin_id: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          ledger_tx_id?: string | null
          reason: string
          target_contract_id?: string | null
          target_deposit_id?: string | null
          target_migration_id?: string | null
          target_user_id?: string | null
          target_withdrawal_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["admin_action_type"]
          admin_id?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          ledger_tx_id?: string | null
          reason?: string
          target_contract_id?: string | null
          target_deposit_id?: string | null
          target_migration_id?: string | null
          target_user_id?: string | null
          target_withdrawal_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wc_admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "wc_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_admin_audit_log_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "vw_contract_ledger_trail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "wc_admin_audit_log_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "wc_ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_admin_audit_log_target_contract_id_fkey"
            columns: ["target_contract_id"]
            isOneToOne: false
            referencedRelation: "wc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_admin_audit_log_target_deposit_id_fkey"
            columns: ["target_deposit_id"]
            isOneToOne: false
            referencedRelation: "wc_deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_admin_audit_log_target_migration_id_fkey"
            columns: ["target_migration_id"]
            isOneToOne: false
            referencedRelation: "wc_migrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_admin_audit_log_target_withdrawal_id_fkey"
            columns: ["target_withdrawal_id"]
            isOneToOne: false
            referencedRelation: "wc_withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_admins: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_contracts: {
        Row: {
          activated_at: string | null
          auto_reinvest: boolean
          cancelled_at: string | null
          closure_ledger_tx_id: string | null
          created_at: string
          creation_ledger_tx_id: string | null
          daily_profit_amount: number
          duration_days_snapshot: number
          expected_profit: number
          id: string
          matured_at: string | null
          maturity_date: string | null
          metadata: Json
          notes: string | null
          origin_type: string | null
          parent_contract_id: string | null
          plan_id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          principal_amount: number
          profit_credited: number
          profit_fully_credited: boolean
          profit_rate_snapshot: number
          release_delay_days: number
          release_eligible_date: string | null
          released_at: string | null
          state: Database["public"]["Enums"]["contract_state"]
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          activated_at?: string | null
          auto_reinvest?: boolean
          cancelled_at?: string | null
          closure_ledger_tx_id?: string | null
          created_at?: string
          creation_ledger_tx_id?: string | null
          daily_profit_amount: number
          duration_days_snapshot: number
          expected_profit: number
          id?: string
          matured_at?: string | null
          maturity_date?: string | null
          metadata?: Json
          notes?: string | null
          origin_type?: string | null
          parent_contract_id?: string | null
          plan_id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          principal_amount: number
          profit_credited?: number
          profit_fully_credited?: boolean
          profit_rate_snapshot: number
          release_delay_days?: number
          release_eligible_date?: string | null
          released_at?: string | null
          state?: Database["public"]["Enums"]["contract_state"]
          updated_at?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          activated_at?: string | null
          auto_reinvest?: boolean
          cancelled_at?: string | null
          closure_ledger_tx_id?: string | null
          created_at?: string
          creation_ledger_tx_id?: string | null
          daily_profit_amount?: number
          duration_days_snapshot?: number
          expected_profit?: number
          id?: string
          matured_at?: string | null
          maturity_date?: string | null
          metadata?: Json
          notes?: string | null
          origin_type?: string | null
          parent_contract_id?: string | null
          plan_id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          principal_amount?: number
          profit_credited?: number
          profit_fully_credited?: boolean
          profit_rate_snapshot?: number
          release_delay_days?: number
          release_eligible_date?: string | null
          released_at?: string | null
          state?: Database["public"]["Enums"]["contract_state"]
          updated_at?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wc_contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "wc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_contracts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "wc_investment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_contracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_cron_job_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_details: Json | null
          id: string
          job_name: string
          records_failed: number
          records_processed: number
          run_date: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          job_name: string
          records_failed?: number
          records_processed?: number
          run_date: string
          started_at: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          job_name?: string
          records_failed?: number
          records_processed?: number
          run_date?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      wc_deposits: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          ledger_tx_id: string | null
          metadata: Json
          notes: string | null
          payment_method: string
          payment_reference: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          ledger_tx_id?: string | null
          metadata?: Json
          notes?: string | null
          payment_method: string
          payment_reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          ledger_tx_id?: string | null
          metadata?: Json
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_deposits_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_investment_plans: {
        Row: {
          auto_reinvest_default: boolean
          capital_release_delay_days: number
          created_at: string
          duration_days: number
          id: string
          is_active: boolean
          label: string
          max_amount: number | null
          min_amount: number
          profit_rate: number
          tier: Database["public"]["Enums"]["plan_tier"]
          valid_from: string
          valid_until: string | null
          version: number
        }
        Insert: {
          auto_reinvest_default?: boolean
          capital_release_delay_days?: number
          created_at?: string
          duration_days: number
          id?: string
          is_active?: boolean
          label: string
          max_amount?: number | null
          min_amount: number
          profit_rate: number
          tier: Database["public"]["Enums"]["plan_tier"]
          valid_from?: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          auto_reinvest_default?: boolean
          capital_release_delay_days?: number
          created_at?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          label?: string
          max_amount?: number | null
          min_amount?: number
          profit_rate?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          valid_from?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: []
      }
      wc_ledger_entries: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          created_at: string
          currency: string
          direction: Database["public"]["Enums"]["entry_direction"]
          id: string
          running_balance: number | null
          sequence_num: number
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          created_at?: string
          currency?: string
          direction: Database["public"]["Enums"]["entry_direction"]
          id?: string
          running_balance?: number | null
          sequence_num: number
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount?: number
          created_at?: string
          currency?: string
          direction?: Database["public"]["Enums"]["entry_direction"]
          id?: string
          running_balance?: number | null
          sequence_num?: number
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wc_ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "vw_contract_ledger_trail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "wc_ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wc_ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_ledger_snapshots: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          closing_balance: number
          created_at: string
          entry_count: number
          id: string
          opening_balance: number
          reconciliation_status: string
          snapshot_date: string
          total_credits: number
          total_debits: number
          user_id: string | null
          variance_amount: number
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          closing_balance: number
          created_at?: string
          entry_count?: number
          id?: string
          opening_balance: number
          reconciliation_status?: string
          snapshot_date: string
          total_credits?: number
          total_debits?: number
          user_id?: string | null
          variance_amount?: number
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          closing_balance?: number
          created_at?: string
          entry_count?: number
          id?: string
          opening_balance?: number
          reconciliation_status?: string
          snapshot_date?: string
          total_credits?: number
          total_debits?: number
          user_id?: string | null
          variance_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "wc_ledger_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_ledger_transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          contract_id: string | null
          created_at: string
          currency: string
          deposit_id: string | null
          description: string
          effective_date: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          idempotency_key: string | null
          initiated_by: string | null
          migration_id: string | null
          prev_hash: string
          row_hash: string
          user_id: string | null
          withdrawal_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          contract_id?: string | null
          created_at?: string
          currency?: string
          deposit_id?: string | null
          description: string
          effective_date?: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          idempotency_key?: string | null
          initiated_by?: string | null
          migration_id?: string | null
          prev_hash?: string
          row_hash?: string
          user_id?: string | null
          withdrawal_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          contract_id?: string | null
          created_at?: string
          currency?: string
          deposit_id?: string | null
          description?: string
          effective_date?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          idempotency_key?: string | null
          initiated_by?: string | null
          migration_id?: string | null
          prev_hash?: string
          row_hash?: string
          user_id?: string | null
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ledger_tx_migration"
            columns: ["migration_id"]
            isOneToOne: false
            referencedRelation: "wc_migrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ledger_tx_withdrawal"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "wc_withdrawals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_ledger_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "wc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_ledger_transactions_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "wc_deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_ledger_transactions_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_ledger_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_migrations: {
        Row: {
          capital_amount: number
          created_at: string
          credit_ledger_tx_id: string | null
          debit_ledger_tx_id: string | null
          id: string
          metadata: Json
          migration_type: string
          new_contract_id: string | null
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_contract_id: string
          status: Database["public"]["Enums"]["approval_status"]
          target_plan_id: string
          target_plan_tier: Database["public"]["Enums"]["plan_tier"]
          topup_amount: number
          total_new_principal: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          capital_amount: number
          created_at?: string
          credit_ledger_tx_id?: string | null
          debit_ledger_tx_id?: string | null
          id?: string
          metadata?: Json
          migration_type: string
          new_contract_id?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_contract_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          target_plan_id: string
          target_plan_tier: Database["public"]["Enums"]["plan_tier"]
          topup_amount?: number
          total_new_principal?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          capital_amount?: number
          created_at?: string
          credit_ledger_tx_id?: string | null
          debit_ledger_tx_id?: string | null
          id?: string
          metadata?: Json
          migration_type?: string
          new_contract_id?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_contract_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          target_plan_id?: string
          target_plan_tier?: Database["public"]["Enums"]["plan_tier"]
          topup_amount?: number
          total_new_principal?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_migrations_new_contract_id_fkey"
            columns: ["new_contract_id"]
            isOneToOne: false
            referencedRelation: "wc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_migrations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_migrations_source_contract_id_fkey"
            columns: ["source_contract_id"]
            isOneToOne: true
            referencedRelation: "wc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_migrations_target_plan_id_fkey"
            columns: ["target_plan_id"]
            isOneToOne: false
            referencedRelation: "wc_investment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_migrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_notification_queue: {
        Row: {
          created_at: string
          event_type: string
          id: string
          is_sent: boolean
          payload: Json
          retry_count: number
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          is_sent?: boolean
          payload?: Json
          retry_count?: number
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          is_sent?: boolean
          payload?: Json
          retry_count?: number
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_profit_accrual_log: {
        Row: {
          accrual_date: string
          amount: number
          contract_id: string
          created_at: string
          day_number: number
          id: string
          ledger_tx_id: string
          user_id: string
        }
        Insert: {
          accrual_date: string
          amount: number
          contract_id: string
          created_at?: string
          day_number: number
          id?: string
          ledger_tx_id: string
          user_id: string
        }
        Update: {
          accrual_date?: string
          amount?: number
          contract_id?: string
          created_at?: string
          day_number?: number
          id?: string
          ledger_tx_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_profit_accrual_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "wc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_profit_accrual_log_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "vw_contract_ledger_trail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "wc_profit_accrual_log_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "wc_ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_profit_accrual_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_users: {
        Row: {
          country_code: string | null
          created_at: string
          email: string
          email_verified: boolean
          full_name: string
          id: string
          is_active: boolean
          is_suspended: boolean
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_verified_at: string | null
          metadata: Json
          phone: string | null
          phone_verified: boolean
          referral_code: string | null
          referred_by_user_id: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          email: string
          email_verified?: boolean
          full_name: string
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_verified_at?: string | null
          metadata?: Json
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by_user_id?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean
          full_name?: string
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_verified_at?: string | null
          metadata?: Json
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by_user_id?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_users_referred_by_user_id_fkey"
            columns: ["referred_by_user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_wallet_balances: {
        Row: {
          available_balance: number
          created_at: string
          id: string
          last_reconciled_at: string | null
          ledger_checksum: string | null
          locked_capital: number
          pending_profit: number
          pending_release_capital: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          id?: string
          last_reconciled_at?: string | null
          ledger_checksum?: string | null
          locked_capital?: number
          pending_profit?: number
          pending_release_capital?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          id?: string
          last_reconciled_at?: string | null
          ledger_checksum?: string | null
          locked_capital?: number
          pending_profit?: number
          pending_release_capital?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_wallet_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_withdrawals: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string
          currency: string
          destination_details: Json
          fee_amount: number
          id: string
          ledger_tx_id: string | null
          metadata: Json
          net_payout: number | null
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          user_id: string
          withdrawal_type: string
        }
        Insert: {
          amount: number
          contract_id?: string | null
          created_at?: string
          currency?: string
          destination_details?: Json
          fee_amount?: number
          id?: string
          ledger_tx_id?: string | null
          metadata?: Json
          net_payout?: number | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id: string
          withdrawal_type: string
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          currency?: string
          destination_details?: Json
          fee_amount?: number
          id?: string
          ledger_tx_id?: string | null
          metadata?: Json
          net_payout?: number | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id?: string
          withdrawal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_withdrawals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "wc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_withdrawals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_admin_pending_queue: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string | null
          item_type: string | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_contract_ledger_trail: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          amount: number | null
          contract_id: string | null
          created_at: string | null
          description: string | null
          direction: Database["public"]["Enums"]["entry_direction"] | null
          effective_date: string | null
          entry_amount: number | null
          entry_type: Database["public"]["Enums"]["ledger_entry_type"] | null
          tx_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wc_ledger_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "wc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_ledger_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_user_ledger_balance: {
        Row: {
          ledger_balance: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wc_ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wc_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_admin_role: { Args: { required_role: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      account_type:
        | "USER_WALLET"
        | "USER_CAPITAL_LOCKED"
        | "USER_CAPITAL_PENDING_RELEASE"
        | "USER_PROFIT_PENDING"
        | "PLATFORM_REVENUE"
        | "PLATFORM_PROFIT_LIABILITY"
        | "PLATFORM_WITHDRAWAL_RESERVE"
        | "PLATFORM_MIGRATION_RESERVE"
        | "PLATFORM_DEPOSIT_CLEARING"
        | "SYSTEM_ADJUSTMENT"
        | "SYSTEM_SUSPENSE"
      admin_action_type:
        | "APPROVE_DEPOSIT"
        | "REJECT_DEPOSIT"
        | "APPROVE_WITHDRAWAL"
        | "REJECT_WITHDRAWAL"
        | "APPROVE_MIGRATION"
        | "REJECT_MIGRATION"
        | "APPROVE_CAPITAL_RELEASE"
        | "FORCE_CONTRACT_CANCEL"
        | "MANUAL_LEDGER_ADJUSTMENT"
        | "KYC_APPROVE"
        | "KYC_REJECT"
        | "USER_SUSPEND"
        | "USER_UNSUSPEND"
        | "BONUS_CREDIT"
        | "PENALTY_APPLY"
      approval_status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
      contract_state:
        | "PENDING"
        | "ACTIVE"
        | "MATURED"
        | "AUTO_REINVESTED"
        | "MIGRATION_PENDING"
        | "MIGRATED"
        | "RELEASE_QUEUE"
        | "RELEASED"
        | "WITHDRAWN"
        | "CANCELLED"
        | "REJECTED"
      entry_direction: "DEBIT" | "CREDIT"
      kyc_status:
        | "UNVERIFIED"
        | "PENDING_REVIEW"
        | "VERIFIED"
        | "REJECTED"
        | "SUSPENDED"
      ledger_entry_type:
        | "DEPOSIT"
        | "DEPOSIT_REJECTED"
        | "INVESTMENT_CREATION"
        | "PROFIT_ACCRUAL"
        | "PROFIT_CREDIT"
        | "WITHDRAWAL_REQUEST"
        | "WITHDRAWAL_APPROVED"
        | "WITHDRAWAL_REJECTED"
        | "CAPITAL_RELEASE"
        | "CAPITAL_WITHDRAWAL"
        | "MIGRATION_DEBIT"
        | "MIGRATION_CREDIT"
        | "AUTO_REINVEST"
        | "MANUAL_REINVEST"
        | "TOP_UP"
        | "ADMIN_ADJUSTMENT"
        | "REFUND"
        | "BONUS"
        | "PENALTY"
        | "PLATFORM_FEE"
        | "REVERSAL"
      plan_tier:
        | "WERTCHAIN_START"
        | "WERTCHAIN_GROWTH"
        | "WERTCHAIN_PROFESSIONAL"
        | "WERTCHAIN_ELITE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: [
        "USER_WALLET",
        "USER_CAPITAL_LOCKED",
        "USER_CAPITAL_PENDING_RELEASE",
        "USER_PROFIT_PENDING",
        "PLATFORM_REVENUE",
        "PLATFORM_PROFIT_LIABILITY",
        "PLATFORM_WITHDRAWAL_RESERVE",
        "PLATFORM_MIGRATION_RESERVE",
        "PLATFORM_DEPOSIT_CLEARING",
        "SYSTEM_ADJUSTMENT",
        "SYSTEM_SUSPENSE",
      ],
      admin_action_type: [
        "APPROVE_DEPOSIT",
        "REJECT_DEPOSIT",
        "APPROVE_WITHDRAWAL",
        "REJECT_WITHDRAWAL",
        "APPROVE_MIGRATION",
        "REJECT_MIGRATION",
        "APPROVE_CAPITAL_RELEASE",
        "FORCE_CONTRACT_CANCEL",
        "MANUAL_LEDGER_ADJUSTMENT",
        "KYC_APPROVE",
        "KYC_REJECT",
        "USER_SUSPEND",
        "USER_UNSUSPEND",
        "BONUS_CREDIT",
        "PENALTY_APPLY",
      ],
      approval_status: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      contract_state: [
        "PENDING",
        "ACTIVE",
        "MATURED",
        "AUTO_REINVESTED",
        "MIGRATION_PENDING",
        "MIGRATED",
        "RELEASE_QUEUE",
        "RELEASED",
        "WITHDRAWN",
        "CANCELLED",
        "REJECTED",
      ],
      entry_direction: ["DEBIT", "CREDIT"],
      kyc_status: [
        "UNVERIFIED",
        "PENDING_REVIEW",
        "VERIFIED",
        "REJECTED",
        "SUSPENDED",
      ],
      ledger_entry_type: [
        "DEPOSIT",
        "DEPOSIT_REJECTED",
        "INVESTMENT_CREATION",
        "PROFIT_ACCRUAL",
        "PROFIT_CREDIT",
        "WITHDRAWAL_REQUEST",
        "WITHDRAWAL_APPROVED",
        "WITHDRAWAL_REJECTED",
        "CAPITAL_RELEASE",
        "CAPITAL_WITHDRAWAL",
        "MIGRATION_DEBIT",
        "MIGRATION_CREDIT",
        "AUTO_REINVEST",
        "MANUAL_REINVEST",
        "TOP_UP",
        "ADMIN_ADJUSTMENT",
        "REFUND",
        "BONUS",
        "PENALTY",
        "PLATFORM_FEE",
        "REVERSAL",
      ],
      plan_tier: [
        "WERTCHAIN_START",
        "WERTCHAIN_GROWTH",
        "WERTCHAIN_PROFESSIONAL",
        "WERTCHAIN_ELITE",
      ],
    },
  },
} as const
