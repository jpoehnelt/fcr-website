---
title: "Roads"
description: "Manages and maintains all Ranch roads, develops road maintenance plans, and develops road safety regulations."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Joe Scarpino", "Mark Smith"],
      members: [],
      email: "roads@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

This committee manages and maintains all Ranch roads in conjunction with the Ranch Caretaker and Liaison. It develops short and long-term road maintenance plans and road safety regulations.

## Automated Entrance Gate

The automated entrance gate is in service. In most cases it opens automatically as you approach, and the exit gate still opens automatically as you drive toward it from the inside. The gate will be open much of the year; it is closed primarily to manage trespassing at the lake.

### Set up your access

1. Register your vehicle license plates and generate your six-digit PIN at [fallscreekranch.org/members/gate](/members/gate/). For security the gate system cannot display an existing PIN, so use **Generate PIN** — or **Replace PIN** if you already have one — to see the new PIN on screen and receive a copy by email. Replacing retires the old PIN immediately. Only one person per household needs to register plates and create a PIN, and the PIN can be shared with your family. Skip plates that are not mounted on the front of the vehicle.
2. Install the **UniFi Endpoint** app from the invitation email in your inbox, then tap **Get Started** or **Activate Endpoint** and follow the prompts.

### Ways to enter

- The UniFi Endpoint app, which works from anywhere
- Your PIN code
- License plate recognition, for registered front plates
- The resident directory at the gate
- A temporary shared code, which is being phased out over the next few weeks; contact the Gate Committee if you need it

RFID stickers are being phased in and will be enabled once tags are distributed. Facial recognition works but tested as less useful for drivers, so it is not part of the initial rollout.

### Visitors and deliveries

Create a visitor pass in the app: open **Visitor Pass**, enter your guest's details and valid dates, and send the QR code. Visitors hold the QR code up to the scanner on the intercom.

Amazon, UPS, and FedEx have their own entrance codes. For other deliveries, have the service contact [gate@fallscreekranch.org](mailto:gate@fallscreekranch.org), or share your PIN with them if time is short. Emergency services open the gate with a special key.

### Trouble getting in

Open the gate through the app, or use the gate directory to call your house or a neighbor. To generate or replace your own PIN, visit the [member gate page](/members/gate/). For persistent issues, or if you need the temporary shared code, contact the Gate Committee at [gate@fallscreekranch.org](mailto:gate@fallscreekranch.org).

## Documents

- [Roads All Year Open](/uploads/documents/fcr-roads-all-year-open.pdf)
- [Roads Committee Rules and Regulations (2013)](/uploads/2012/05/FCR-Road-Comm-Rules-and-Regulations-rev-2013_03.pdf)
- [FCR Speeding Violation Policy (2010)](/uploads/2012/05/FCR-Speeding-Violation-Policy-2010.pdf)
- [Winter Snow Removal and Driving Guidelines](/uploads/2022/02/FCR.WinterDriving.Updated2022-2.pdf)
- [Roads Committee Useful Information](/uploads/2022/02/Road-Committee-Useful-Information-2022.pdf)

<FileHistory file="src/routes/committees/roads/+page.md" />
