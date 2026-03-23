terraform {
  required_providers {
    googleworkspace = {
      source  = "hashicorp/googleworkspace"
      version = "~> 0.7"
    }
  }
}

provider "googleworkspace" {
  credentials             = "${path.module}/sa-key.json"
  customer_id             = var.customer_id
  impersonated_user_email = var.admin_email
  oauth_scopes = [
    "https://www.googleapis.com/auth/admin.directory.group",
    "https://www.googleapis.com/auth/admin.directory.group.member",
    "https://www.googleapis.com/auth/apps.groups.settings",
  ]
}

variable "customer_id" {
  description = "Google Workspace Customer ID"
  type        = string
}

variable "admin_email" {
  description = "Admin email to impersonate"
  type        = string
}

variable "domain" {
  description = "Domain for the groups"
  type        = string
  default     = "fallscreekranch.org"
}

locals {
  # -------------------------------------------------------------------------
  # Committees
  # -------------------------------------------------------------------------
  committees = {
    "architectural-control" = { name = "Architectural Control Committee" }
    "beautification"        = { name = "Beautification Committee" }
    "bees-chickens"         = { name = "Bees & Chickens Committee" }
    "common-property"       = { name = "Common Property Committee" }
    "community-garden"      = { name = "Community Garden Committee" }
    "community-orchard"     = { name = "Community Orchard Committee" }
    "dam"                   = { name = "Dam Committee" }
    "firewise"              = { name = "Firewise Committee" }
    "horse"                 = { name = "Horse Committee" }
    "lake"                  = { name = "Lake Committee" }
    "roads"                 = { name = "Roads Committee" }
    "tennis-pickleball"     = { name = "Tennis/Pickleball Committee" }
    "trails-planning"       = { name = "Trails Committee" }
    "utilities"             = { name = "Utilities Committee" }
    "vittles"               = { name = "Vittles Committee" }
    "welcome"               = { name = "Welcome Committee" }
  }

  # -------------------------------------------------------------------------
  # Board & officers
  # -------------------------------------------------------------------------
  board_groups = {
    "board"         = { name = "Board" }
    "president"     = { name = "President" }
    "vicepresident" = { name = "Vice President" }
    "secretary"     = { name = "Secretary" }
    "treasurer"     = { name = "Treasurer" }
    "atlarge"       = { name = "At-Large" }
  }

  # -------------------------------------------------------------------------
  # Other lists
  # -------------------------------------------------------------------------
  other_groups = {
    "committee-chairs" = { name = "Committee Chairs" }
    "trails"           = { name = "Trails" }
    "webmaster"        = { name = "Webmaster" }
  }
}

# =========================================================================== #
# Groups
# =========================================================================== #

resource "googleworkspace_group" "committee" {
  for_each    = local.committees
  email       = "${each.key}@${var.domain}"
  name        = each.value.name
  description = "Falls Creek Ranch ${each.value.name}"
}

resource "googleworkspace_group" "board" {
  for_each    = local.board_groups
  email       = "${each.key}@${var.domain}"
  name        = each.value.name
  description = "Falls Creek Ranch ${each.value.name}"
}

resource "googleworkspace_group" "other" {
  for_each    = local.other_groups
  email       = "${each.key}@${var.domain}"
  name        = each.value.name
  description = "Falls Creek Ranch ${each.value.name}"
}

# =========================================================================== #
# Group Settings — shared across all groups
# =========================================================================== #

resource "googleworkspace_group_settings" "committee" {
  for_each                       = local.committees
  email                          = googleworkspace_group.committee[each.key].email
  who_can_post_message           = "ANYONE_CAN_POST"
  who_can_join                   = "CAN_REQUEST_TO_JOIN"
  allow_external_members         = true
  allow_web_posting              = true
  message_moderation_level       = "MODERATE_NONE"
  who_can_view_membership        = "ALL_MEMBERS_CAN_VIEW"
  include_in_global_address_list = true
}

resource "googleworkspace_group_settings" "board" {
  for_each                       = local.board_groups
  email                          = googleworkspace_group.board[each.key].email
  who_can_post_message           = "ANYONE_CAN_POST"
  who_can_join                   = "CAN_REQUEST_TO_JOIN"
  allow_external_members         = true
  allow_web_posting              = true
  message_moderation_level       = "MODERATE_NONE"
  who_can_view_membership        = "ALL_MEMBERS_CAN_VIEW"
  include_in_global_address_list = true
}

resource "googleworkspace_group_settings" "other" {
  for_each                       = local.other_groups
  email                          = googleworkspace_group.other[each.key].email
  who_can_post_message           = "ANYONE_CAN_POST"
  who_can_join                   = "CAN_REQUEST_TO_JOIN"
  allow_external_members         = true
  allow_web_posting              = true
  message_moderation_level       = "MODERATE_NONE"
  who_can_view_membership        = "ALL_MEMBERS_CAN_VIEW"
  include_in_global_address_list = true
}

# =========================================================================== #
# Group Nesting
# =========================================================================== #

# Every committee group → committee-chairs@
resource "googleworkspace_group_member" "committee_in_chairs" {
  for_each = local.committees
  group_id = googleworkspace_group.other["committee-chairs"].id
  email    = googleworkspace_group.committee[each.key].email
  role     = "MEMBER"
  type     = "GROUP"
}
