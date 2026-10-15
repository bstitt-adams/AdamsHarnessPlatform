/**
 * Database Type Definitions for Adams Platform
 * 
 * This file contains TypeScript types for the Supabase database schema.
 * These types provide type safety when querying the database.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  adams: {
    Tables: {
      users: {
        Row: {
          id: string
          firebase_uid: string | null
          email: string
          name: string
          role: 'admin' | 'team' | 'affiliate' | 'consultant'
          avatar: string | null
          phone: string | null
          title: string | null
          department: string | null
          bio: string | null
          linkedin_url: string | null
          is_active: boolean
          created_at: string
          last_active: string
          updated_at: string
        }
        Insert: {
          id?: string
          firebase_uid?: string | null
          email: string
          name: string
          role: 'admin' | 'team' | 'affiliate' | 'consultant'
          avatar?: string | null
          phone?: string | null
          title?: string | null
          department?: string | null
          bio?: string | null
          linkedin_url?: string | null
          is_active?: boolean
          created_at?: string
          last_active?: string
          updated_at?: string
        }
        Update: {
          id?: string
          firebase_uid?: string | null
          email?: string
          name?: string
          role?: 'admin' | 'team' | 'affiliate' | 'consultant'
          avatar?: string | null
          phone?: string | null
          title?: string | null
          department?: string | null
          bio?: string | null
          linkedin_url?: string | null
          is_active?: boolean
          created_at?: string
          last_active?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          industry: string | null
          website: string | null
          description: string | null
          logo_url: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          country: string | null
          phone: string | null
          email: string | null
          linkedin_url: string | null
          employee_count: number | null
          annual_revenue: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          industry?: string | null
          website?: string | null
          description?: string | null
          logo_url?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          linkedin_url?: string | null
          employee_count?: number | null
          annual_revenue?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          industry?: string | null
          website?: string | null
          description?: string | null
          logo_url?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          linkedin_url?: string | null
          employee_count?: number | null
          annual_revenue?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      opportunities: {
        Row: {
          id: string
          title: string
          description: string | null
          organization_id: string | null
          owner_id: string | null
          stage: string
          value: number | null
          probability: number | null
          expected_close_date: string
          actual_close_date: string | null
          status: string
          priority: string
          source: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          organization_id?: string | null
          owner_id?: string | null
          stage: string
          value?: number | null
          probability?: number | null
          expected_close_date: string
          actual_close_date?: string | null
          status?: string
          priority?: string
          source?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          organization_id?: string | null
          owner_id?: string | null
          stage?: string
          value?: number | null
          probability?: number | null
          expected_close_date?: string
          actual_close_date?: string | null
          status?: string
          priority?: string
          source?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add more table types as needed
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
