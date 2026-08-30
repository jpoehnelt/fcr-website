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

The automated entrance gate is ready to use. In most cases it opens automatically as you approach. This guide covers how to set up your access and how to help your visitors get in.

### Step 1: Register your license plates

Enter your vehicle license plate information at [fallscreekranch.org/members/gate](/members/gate/). Only one person per household needs to register license plates.

Check your email for your current PIN; if you don't have one, use **Generate PIN** on that page. This PIN can be shared with members of your family. You can change it later with **Replace PIN**, which deletes the old PIN — it can't be used again. For security the gate system cannot redisplay an existing PIN, so generating or replacing it is the only way to see one on screen.

### Step 2: Set up the mobile app

1. Install the **UniFi Endpoint** app on your smartphone: [Google Play](https://play.google.com/store/apps/details?id=com.ui.uid.standard&hl=en_US) or the [App Store](https://apps.apple.com/us/app/unifi-endpoint/id6450954172).
2. After installing the app, look in your email for an invitation from **identity@ui.com** with a subject similar to "Welcome to UniFi Identity!" Open the email and tap **Get Started** or **Activate Endpoint**, then follow the prompts.
3. If a sign-in screen appears instead, return to the invitation email and tap the link again.

### Entering the ranch

You can open the entrance gate in several ways:

- Using the **UniFi Endpoint** app on your phone — this works from anywhere
- Entering your PIN code
- License plate recognition, if you have a front license plate and registered it in Step 1
- Using the resident directory at the gate
- Entering the temporary code, which will be disabled after a few weeks — contact the Gate Committee if you need it

RFID stickers are being phased in and will be fully enabled soon.

### Leaving the ranch

Leaving the ranch remains the same. The exit gate opens automatically as you drive toward it from the inside.

### Managing your visitors

You can invite guests, contractors, or delivery drivers using the app:

1. Go to the **Visitor Pass** section in the app.
2. Enter your guest's details and the dates the pass is valid for.
3. Send the generated QR code to your visitor.

When your visitor arrives, they hold the QR code up to the scanner on the intercom to open the gate.

### Deliveries

All major delivery services have a code for the entrance. If a delivery is coming from a service other than Amazon, UPS, or FedEx, have them contact [gate@fallscreekranch.org](mailto:gate@fallscreekranch.org). You can also share your PIN code with them if time is short.

### Troubleshooting and support

If you have any trouble getting in:

- Try opening the gate directly through the mobile app.
- Use the gate directory to call your house or a neighbor.
- Use the temporary code, if you have it.
- For persistent issues, reach out to the Gate Committee at [gate@fallscreekranch.org](mailto:gate@fallscreekranch.org).

### Frequently asked questions

**What about facial recognition and RFID tags? We heard those were part of the gate system.**

Both are working, but we need to pass out RFID tags first, and that will happen next. We'll share more about facial recognition soon; testing has shown it to be less useful for drivers, so it isn't important to share from the start.

**Will the gate always be closed?**

No. The main purpose of the gate is to manage the trespassing problems we've had at the lake. During times when trespassing isn't a problem we'll leave the gate open — nights, cooler times of the year, and so on. The gate will probably be open 90% of the year.

**How are deliveries managed?**

Each delivery service has a code that they enter at the entrance. This is standard practice for them.

**How do police, ambulances, and fire crews get access?**

Emergency services have a special key that opens gates such as ours.

## Documents

- [Roads All Year Open](/uploads/documents/fcr-roads-all-year-open.pdf)
- [Roads Committee Rules and Regulations (2013)](/uploads/2012/05/FCR-Road-Comm-Rules-and-Regulations-rev-2013_03.pdf)
- [FCR Speeding Violation Policy (2010)](/uploads/2012/05/FCR-Speeding-Violation-Policy-2010.pdf)
- [Winter Snow Removal and Driving Guidelines](/uploads/2022/02/FCR.WinterDriving.Updated2022-2.pdf)
- [Roads Committee Useful Information](/uploads/2022/02/Road-Committee-Useful-Information-2022.pdf)

<FileHistory file="src/routes/committees/roads/+page.md" />
