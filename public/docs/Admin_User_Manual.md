# Narayaneeyam Sadhana — Admin User Manual

**Version:** 1.0  
**Last Updated:** March 2026  
**Audience:** Non-technical administrators  

---

## Table of Contents

1. [Introduction](#section-1--introduction)
2. [Logging In & Out](#section-2--logging-in--out)
3. [Understanding the Data Structure](#section-3--understanding-the-data-structure)
4. [Managing Dashakams](#section-4--managing-dashakams)
5. [Managing Verses](#section-5--managing-verses)
6. [Managing Multilingual Content](#section-6--managing-multilingual-content)
7. [Managing Audio Files](#section-7--managing-audio-files)
8. [Managing Images](#section-8--managing-images)
9. [Lesson Plan Management](#section-9--lesson-plan-management-learn-with-me-module)
10. [Common Tasks (Quick Reference)](#section-10--common-tasks-quick-reference)
11. [Troubleshooting](#section-11--troubleshooting)
12. [Best Practices & Tips](#section-12--best-practices--tips)
13. [Glossary](#section-13--glossary)

---

## Section 1 — Introduction

### What is the Narayaneeyam Sadhana Admin Panel?

The Narayaneeyam Sadhana Admin Panel is the back-office area of the Narayaneeyam Sadhana webapp. It allows authorised administrators to add, edit, and manage all the content that devotees see and hear when they use the app — including verses, audio recordings, images, translations, and more.

The Admin Panel is **not visible** to regular users. Only users who have been granted the **Admin** role can access it.

### Who is this manual for?

This manual is written for **administrators** (admins) of the Narayaneeyam Sadhana webapp. You do not need any technical or programming knowledge to follow this guide. Every action is explained step-by-step with clear instructions.

### What can the Admin do?

As an Admin, you can:

- Add, edit, and delete **Dashakams** (groups of verses)
- Add, edit, and delete individual **Verses** within each Dashakam
- Upload and manage **audio files** for chanting, learning, and podcasts
- Upload and manage **images** displayed during playback
- Enter **transliterations** (verse text) in multiple languages and scripts
- Enter **translations** (meanings) in multiple languages
- Configure **Bell** and **Arathi** settings for specific verses
- Enter **Prasadam** (offering) names in multiple languages
- Enter **special Slokam** (prayer verses) attached to specific verses
- Manage the **Lesson Plan** (the order in which Dashakams appear in the Learn module)
- Manage **Festival** configurations

### How to access the Admin Panel

1. Open your web browser (Chrome, Safari, Firefox, or Edge recommended).
2. Go to the app URL: `https://[your-app-domain]`
3. Log in with your admin credentials (see Section 2).
4. Once logged in, navigate to `/admin/content` in the address bar, or use the admin link in the navigation menu (visible only to admins).

### Overview of the Admin Panel Layout

When you open the Admin Content Manager, you will see:

| Area | Description |
|------|-------------|
| **Top Header** | Shows the app logo, navigation links, and a Logout button. |
| **Dashakam & Verse Selector** | A row of number fields at the top of the page where you choose which Dashakam (1–100) and Verse (1–14) you want to work on. |
| **Tab Bar** | Six tabs: **Dashakam**, **Audio**, **Image**, **Scripts**, **Translations**, **Metadata**. Click a tab to see its fields. |
| **Content Area** | The main area below the tabs, showing input fields, toggles, and buttons for the selected tab. |
| **Save Buttons** | Each tab has its own **Save** button at the bottom. |

---

## Section 2 — Logging In & Out

### How to Log In

1. Open the app in your web browser.
2. Click the **Login** or **Sign In** button on the home page.
3. Enter your **email address** in the Email field.
4. Enter your **password** in the Password field.
5. Click the **Sign In** button.
6. ✅ **SUCCESS:** You will be taken to the Dashboard. If you are an admin, you will see admin navigation links.

> 💡 **TIP:** Use the same email address that was registered as an admin account. If you are unsure which email to use, contact the team lead.

### What to do if you forget your password

1. On the login page, click **"Forgot Password?"**.
2. Enter your registered email address.
3. Click **Send Reset Link**.
4. Check your email inbox (and spam/junk folder) for a password reset email.
5. Click the link in the email.
6. Enter your new password and confirm it.
7. Click **Reset Password**.
8. ✅ **SUCCESS:** Your password has been updated. You can now log in with your new password.

> ⚠️ **WARNING:** The reset link expires after a limited time. If it has expired, request a new one.

### How to Log Out Safely

1. Look for the **Logout** icon (a door/arrow icon) in the top-right area of the header.
2. On **mobile devices**, the Logout icon appears next to the menu icon in the header.
3. Click the **Logout** icon.
4. ✅ **SUCCESS:** You will be signed out and returned to the home page.

> 💡 **TIP:** Always log out when you are finished, especially on shared computers.

### Session Timeout — What it is and what to do

Your login session will automatically expire after a period of inactivity (typically 1 hour). When this happens:

- You may see a blank page or be redirected to the login screen.
- Any **unsaved changes will be lost**.

**What to do:**
1. Simply log in again using your email and password.
2. Navigate back to the page you were working on.

> 💡 **TIP:** Save your work frequently to avoid losing changes due to session timeout.

---

## Section 3 — Understanding the Data Structure

### What is a Dashakam?

A **Dashakam** is a group of verses (typically 10 verses, but some may have more or fewer). The Narayaneeyam consists of **100 Dashakams**, numbered 1 through 100. Think of a Dashakam like a "chapter" — each chapter covers a particular story or theme from the life of Lord Krishna.

### What is a Verse (Slokam)?

A **Verse** (also called a **Slokam**) is a single prayer verse within a Dashakam. Each Dashakam typically contains **10 verses**, but some may have up to **14 verses**. Each verse has its own text, audio recording, translation, and other settings.

### How Dashakams and Verses are related

Think of it as a **parent-child** relationship:

```
Dashakam 1 (parent)
  ├── Verse 1
  ├── Verse 2
  ├── Verse 3
  ├── ... up to Verse 10 (or more)
  
Dashakam 2 (parent)
  ├── Verse 1
  ├── Verse 2
  └── ...
```

Every verse **belongs to** exactly one Dashakam. You must first select a Dashakam number before you can work on its verses.

### What is a Slokam (Special Prayer Verse)?

Some verses have a **special Slokam** — an additional prayer or invocation that is recited at that particular point during chanting. Not every verse has one. When a Slokam is present, it is played/displayed automatically in the Chant, Learn, and Script modules.

### What is Prasadam?

**Prasadam** is the sacred offering (food item) associated with a particular verse or Dashakam. The Prasadam name is displayed in the app so devotees know what offering to prepare. It can be entered in multiple languages.

### What is Transliteration vs Translation?

| Term | Meaning | Example |
|------|---------|---------|
| **Transliteration** | The verse text written in a different script. The sounds stay the same, but the letters change. | Sanskrit verse written in Tamil script or English (Roman) script. |
| **Translation** | The meaning of the verse in another language. | The meaning of a Sanskrit verse explained in English or Tamil. |

**In simple terms:**
- **Transliteration** = same sounds, different letters
- **Translation** = same meaning, different language

### What are Arathi and Bell?

- **Bell**: When enabled for a verse, a bell sound plays at the end of that verse during chanting. This is used to signal a special moment in the prayer.
- **Arathi**: When enabled for a verse, an Arathi (ceremonial waving of a lamp) notification or visual cue is shown at that verse. This tells the devotee to perform Arathi at this point.

### Audio File Naming Convention

Audio files follow a **strict naming pattern**. Using the correct name is critical — if the name is wrong, the audio will not play in the app.

**Naming Pattern:**

| Purpose | File Name Format | Example (Dashakam 1, Verse 1) |
|---------|-----------------|-------------------------------|
| Chant & Podcast audio | `SL[DDD]-[VV]` | `SL001-01` |
| Learn audio | `SL[DDD]-[VV]_Learn` | `SL001-01_Learn` |
| Sloka audio (Chant/Podcast) | `SL[DDD]-[VV]_Sloka[V]` | `SL001-01_Sloka1` |
| Sloka audio (Learn) | `SL[DDD]-[VV]_Sloka[V]_Learn` | `SL001-01_Sloka1_Learn` |
| Display image | `SL[DDD]_Image` | `SL001_Image` |

Where:
- **DDD** = Dashakam number, always **3 digits** (e.g., 001, 010, 100)
- **VV** = Verse number, always **2 digits** (e.g., 01, 02, 10)

**Examples for Dashakams 1–3:**

| Dashakam | Verse | Chant Audio | Learn Audio | Sloka Audio | Image |
|----------|-------|-------------|-------------|-------------|-------|
| 1 | 1 | SL001-01 | SL001-01_Learn | SL001-01_Sloka1 | SL001_Image |
| 1 | 2 | SL001-02 | SL001-02_Learn | SL001-02_Sloka2 | SL001_Image |
| 1 | 10 | SL001-10 | SL001-10_Learn | SL001-10_Sloka10 | SL001_Image |
| 2 | 1 | SL002-01 | SL002-01_Learn | SL002-01_Sloka1 | SL002_Image |
| 2 | 5 | SL002-05 | SL002-05_Learn | SL002-05_Sloka5 | SL002_Image |
| 3 | 1 | SL003-01 | SL003-01_Learn | SL003-01_Sloka1 | SL003_Image |

> ⚠️ **WARNING:** If an audio file name is entered incorrectly in the admin panel, the app will **not be able to find or play** the audio file. The verse will appear silent, or an error may be shown to the user. Always double-check file names before saving.

---

## Section 4 — Managing Dashakams

### 4.1 Viewing All Dashakams

1. Navigate to **Admin Content Manager** (`/admin/content`).
2. The **Dashakam & Verse Selector** at the top shows the current Dashakam number.
3. Use the **Dashakam No** field to enter or change the Dashakam number (1–100).
4. The display will update to show **D001**, **D002**, etc.

> 💡 **TIP:** You can type a number directly or use the up/down arrows in the number field to browse through Dashakams.

### 4.2 Adding a New Dashakam

1. In the **Dashakam No** field, enter the number of the new Dashakam (e.g., `51`).
2. Set the **Num Verses in Dashakam** field to the correct number of verses (usually 10).
3. Click the **Dashakam** tab.
4. Fill in the following fields:

| Field | Required? | Description |
|-------|-----------|-------------|
| **Dashakam Name (Sanskrit)** | ✅ Yes | The name in Sanskrit / Devanagari script |
| **Dashakam Name (English)** | ✅ Yes | The name in English |
| **Dashakam Name (Tamil)** | ✅ Yes (MVP) | The name in Tamil script |
| **Dashakam Name (Malayalam)** | Optional | The name in Malayalam script |
| **Dashakam Name (Telugu)** | Optional | The name in Telugu script |
| **Dashakam Name (Kannada)** | Optional | The name in Kannada script |
| **Dashakam Name (Hindi)** | Optional | The name in Hindi |
| **Dashakam Name (Marathi)** | Optional | The name in Marathi |
| **Gist / Summary** | Optional | A brief description of the Dashakam's theme |
| **Benefits** | Optional | Spiritual benefits of chanting this Dashakam |
| **Remarks** | Optional | Any special notes for the team |

5. To enter names in different languages, click the **language buttons** (Sanskrit, English, Tamil, etc.) to switch between languages. A **✓** mark appears next to languages that have been filled in.
6. Click **Save Dashakam Info**.
7. ✅ **SUCCESS:** A confirmation message will appear: "Dashakam Info saved."

### 4.3 Editing an Existing Dashakam

1. Enter the Dashakam number in the **Dashakam No** field.
2. Click the **Dashakam** tab.
3. The existing data will be loaded (once database is connected).
4. Make your changes to any field.
5. Click **Save Dashakam Info**.
6. ✅ **SUCCESS:** A confirmation message will appear.

> ⚠️ **WARNING:** Changing the Dashakam number after data has been saved may break links to verses, audio files, and images. Only change the Dashakam number if you are certain, and update all related verse and audio data accordingly.

### 4.4 Deleting a Dashakam

1. Navigate to the Dashakam you wish to delete.
2. Click the **Delete** button (when available).
3. A **confirmation prompt** will appear: *"Are you sure you want to delete Dashakam X? This will also delete all verses, audio links, and translations associated with this Dashakam."*
4. Click **Confirm** to proceed, or **Cancel** to go back.

> ⚠️ **WARNING:** Deleting a Dashakam is a **permanent, destructive action**. All verses, translations, audio links, and metadata associated with that Dashakam will be permanently removed. This action **cannot be undone**. Always confirm with the team before deleting.

---

## Section 5 — Managing Verses

### 5.1 Viewing Verses of a Dashakam

1. Enter the **Dashakam number** in the Dashakam No field (e.g., `1`).
2. The **Verse No** field allows you to select a specific verse (1–14).
3. The current selection is shown in the indicator box: e.g., **D001 · V01**.

### 5.2 Adding a New Verse

Follow these steps to add a complete verse entry:

**Step 1: Select the Dashakam and Verse**
1. Enter the **Dashakam Number** (e.g., `1`).
2. Enter the **Verse Number** (e.g., `5`).

**Step 2: Configure Audio (Audio Tab)**
3. Click the **Audio** tab.
4. For **Chant / Podcast** audio:
   - The expected file name is shown automatically (e.g., `SL001-05.m4a`).
   - Upload the audio file using the file picker, or note the file name for later upload.
5. For **Learn** audio:
   - Click the **Learn** button to switch to Learn variant.
   - The expected file name is shown (e.g., `SL001-05_Learn.m4a`).
   - Upload the Learn audio file.
6. Click **Upload Audio** if uploading a file.

**Step 3: Set the Image (Image Tab)**
7. Click the **Image** tab.
8. Enter the **Image File Name** (e.g., `D001_krishna.jpg`).
9. Upload the image file using the file picker.
10. Click **Upload Image**.

**Step 4: Enter Transliterations (Scripts Tab)**
11. Click the **Scripts** tab.
12. Under **Transliteration (Verse Text)**:
    - Click **English** and type the verse in English (Roman) script.
    - Click **Tamil** and type the verse in Tamil script.
    - Click **Sanskrit** and type the verse in Devanagari script.
    - Repeat for other languages as needed (Malayalam, Telugu, Kannada).
    - A **✓** appears next to each language that has been filled in.

> **What is Transliteration?** This is the actual verse text (the sounds of the Sanskrit verse) written in different scripts so users can read and chant along in a script they are comfortable with.

13. Under **Special Slokam** (if applicable):
    - Enter the special prayer text in each language.
    - This Slokam will appear in the app at this verse during chanting.

> **What is a Special Slokam?** Some verses have an additional short prayer that is recited at that point. If this verse does not have one, leave these fields blank.

14. Click **Save Scripts**.

**Step 5: Enter Translations (Translations Tab)**
15. Click the **Translations** tab.
16. Under **Translation / Meaning**:
    - Click **English** and enter the meaning of the verse in English.
    - Click **Tamil** and enter the meaning in Tamil.
    - Repeat for other languages as needed.

> **What is Translation?** This is the meaning (explanation) of the verse in different languages, so users can understand what the verse says.

17. Click **Save Translation**.

**Step 6: Set Metadata (Metadata Tab)**
18. Click the **Metadata** tab.
19. Configure the following:

| Field | Description | How it works in the app |
|-------|-------------|------------------------|
| **Bell** (toggle) | Turn ON if a bell should ring at this verse. | A bell sound plays after the verse audio ends during chanting. |
| **Arathi** (toggle) | Turn ON if Arathi should be performed at this verse. | A visual cue appears telling the devotee to wave the lamp. |
| **Prasadam Name** | Enter the name of the offering in each language. | Displayed to the devotee so they know what food offering to prepare. |
| **Meter (Chandas)** | The poetic meter of the verse (e.g., Sragdharā). | Shown for reference in the Script module. |

20. Click **Save Metadata**.

**Mandatory Fields Summary:**

| Field | Required? |
|-------|-----------|
| Dashakam Number | ✅ Yes |
| Verse Number | ✅ Yes |
| Audio File Name (Chant) | ✅ Yes |
| Transliteration (English) | ✅ Yes |
| Transliteration (Sanskrit) | ✅ Yes |
| Translation (English) | ✅ Yes |
| All other fields | Optional |

✅ **SUCCESS:** After saving each tab, a confirmation toast message appears at the bottom of the screen.

### 5.3 Editing an Existing Verse

1. Enter the **Dashakam number** and **Verse number** to navigate to the verse.
2. Click the tab containing the data you want to edit (e.g., **Translations**).
3. The existing data will be displayed (once database is connected).
4. **Editing multilingual fields:** Click the language button (e.g., Tamil) to switch to that language's text. Edit the text. Click another language button to edit that language.
5. Click the **Save** button for that tab.
6. ✅ **SUCCESS:** A confirmation message appears.

### 5.4 Deleting a Verse

1. Navigate to the verse you want to delete by entering its Dashakam and Verse numbers.
2. Click the **Delete Verse** button (when available).
3. A confirmation prompt will appear.
4. Click **Confirm** to delete, or **Cancel** to keep the verse.

> ⚠️ **WARNING:** Deleting a verse removes its transliterations, translations, audio links, metadata, and Slokam text permanently. The verse will no longer appear in the Chant, Learn, Script, or Podcast modules. This action **cannot be undone**.

---

## Section 6 — Managing Multilingual Content

### Supported Languages

**Transliteration Languages (verse text in different scripts):**

| Language | Script | MVP Status |
|----------|--------|------------|
| Sanskrit | Devanagari | ✅ Included in MVP |
| English | Roman/Latin | ✅ Included in MVP |
| Tamil | Tamil script | ✅ Included in MVP |
| Malayalam | Malayalam script | Available (post-MVP) |
| Telugu | Telugu script | Available (post-MVP) |
| Kannada | Kannada script | Available (post-MVP) |

**Translation Languages (meaning in different languages):**

| Language | MVP Status |
|----------|------------|
| English | ✅ Included in MVP |
| Tamil | ✅ Included in MVP |
| Malayalam | Available (post-MVP) |
| Telugu | Available (post-MVP) |
| Kannada | Available (post-MVP) |
| Hindi | Available (post-MVP) |
| Marathi | Available (post-MVP) |

### How to Switch Between Languages

1. In any multilingual field (Transliteration, Translation, Dashakam Name, Prasadam Name, Slokam), you will see a row of **language buttons** at the top.
2. Click a language button (e.g., **Tamil**) to switch to that language.
3. The text field below will show the text for the selected language.
4. Type or edit the text.
5. Click another language button to enter text in a different language.
6. A **✓** mark appears next to languages that have content entered.

### What happens if a translation is missing?

If a translation or transliteration is not entered for a particular language:
- The app will **not show** that language as an option for that verse.
- Users who have selected that language will see a fallback (usually English) or a blank space.

> 💡 **TIP:** Always complete **English** content first, as it serves as the fallback language for all modules.

### Tips for entering Sanskrit text

- Use a **Devanagari keyboard** or an online transliteration tool (e.g., Google Input Tools).
- Copy-paste from a trusted source document to avoid typos.
- Double-check diacritical marks (e.g., ā, ī, ū, ṇ, ṣ, ś) when entering in Roman/English script.
- Preview the text in the app after saving to ensure it displays correctly.

---

## Section 7 — Managing Audio Files

### Where audio files are stored

Audio files are stored in a **cloud storage bucket** (Backblaze B2 or Supabase Storage). The admin panel allows you to upload files directly to this storage.

### How to upload a new audio file

1. Navigate to **Admin Content Manager** → Select the Dashakam and Verse.
2. Click the **Audio** tab.
3. Select the audio variant:
   - **Chant / Podcast** — for the Chant and Podcast modules.
   - **Learn** — for the Learn With Me module.
4. The **expected file name** is displayed automatically (e.g., `SL001-01.m4a`).
5. Click the **Choose File** button and select the audio file from your computer.
6. Click **Upload Audio**.
7. ✅ **SUCCESS:** A confirmation message appears.

### Strict Naming Convention — Full Reference Table

| Module | File Name Format | Example (D1, V1) | Example (D10, V5) |
|--------|-----------------|-------------------|---------------------|
| Chant & Podcast | `SL[DDD]-[VV].m4a` | `SL001-01.m4a` | `SL010-05.m4a` |
| Learn | `SL[DDD]-[VV]_Learn.m4a` | `SL001-01_Learn.m4a` | `SL010-05_Learn.m4a` |
| Sloka (Chant/Podcast) | `SL[DDD]-[VV]_Sloka[V].m4a` | `SL001-01_Sloka1.m4a` | `SL010-05_Sloka5.m4a` |
| Sloka (Learn) | `SL[DDD]-[VV]_Sloka[V]_Learn.m4a` | `SL001-01_Sloka1_Learn.m4a` | `SL010-05_Sloka5_Learn.m4a` |

> ⚠️ **WARNING:** File names are **case-sensitive**. `SL001-01.m4a` and `sl001-01.m4a` are treated as different files. Always use uppercase `SL`.

### Accepted audio file formats

- **M4A** (preferred)
- **MP3** (accepted)
- **WAV** (accepted, but files may be large)

> 💡 **TIP:** M4A format is recommended for the best balance of quality and file size.

### What to do if an audio file is not playing

1. **Check the file name** — go to the Admin panel, find the verse, and verify the audio file name matches the naming convention exactly.
2. **Check the file was uploaded** — ensure the file was successfully uploaded to storage.
3. **Check the file format** — ensure it is M4A, MP3, or WAV.
4. **Clear the browser cache** — sometimes old data is cached. Ask the user to refresh the page.
5. **Re-upload the file** — if the file may be corrupted, upload a fresh copy.

### How to replace an existing audio file

1. Navigate to the verse in the Admin panel.
2. Click the **Audio** tab.
3. Upload a new file with the **same file name** as the existing one.
4. The old file will be overwritten.

> ⚠️ **WARNING:** Replacing an audio file is immediate. The old file cannot be recovered. Make sure you have a backup before replacing.

### How to delete an audio file

1. Navigate to the verse in the Admin panel.
2. Clear the audio file name field.
3. Save.

> ⚠️ **WARNING:** Deleting an audio file means the verse will have **no audio** in the app. Users will experience silence when that verse is reached during chanting or learning.

---

## Section 8 — Managing Images

### Where image files are stored

Image files are stored in the same **cloud storage bucket** as audio files.

### How to upload a new image

1. Navigate to **Admin Content Manager** → Select the Dashakam.
2. Click the **Image** tab.
3. Enter the **Image File Name** (e.g., `D001_krishna.jpg`).
4. Click the **Choose File** button and select the image from your computer.
5. Click **Upload Image**.
6. ✅ **SUCCESS:** A confirmation message appears.

### Naming convention for images

Images are typically named by Dashakam:
- `D001_krishna.jpg` — Image for Dashakam 1
- `D002_vishnu.jpg` — Image for Dashakam 2

> 💡 **TIP:** Use descriptive but short names. Avoid spaces and special characters.

### Recommended image dimensions and file size

| Property | Recommendation |
|----------|---------------|
| **Width** | 1200 pixels minimum |
| **Height** | 800 pixels minimum |
| **Aspect Ratio** | 3:2 or 16:9 preferred |
| **File Size** | Under 500 KB for fast loading |
| **Resolution** | 72 DPI (screen resolution) is sufficient |

### Accepted image formats

- **JPG / JPEG** (recommended for photographs)
- **PNG** (for images with transparency)
- **WebP** (modern format, smaller file size)

### How to replace an existing image

1. Navigate to the Dashakam in the Admin panel.
2. Click the **Image** tab.
3. Upload a new file. If the file name is the same, it will overwrite the old image.
4. If the file name is different, update the **Image File Name** field to match.
5. Save.

> ⚠️ **WARNING:** After replacing an image, users may need to refresh the app to see the new image due to browser caching.

---

## Section 9 — Lesson Plan Management (Learn With Me Module)

### What is the Lesson Plan?

The **Lesson Plan** controls the **order** in which Dashakams appear in the **Learn With Me** module. Instead of always starting from Dashakam 1, the Lesson Plan may follow a specific learning sequence recommended by the teacher or organisation.

### How to view the current Lesson Plan order

1. Navigate to **Lesson Plan** page (`/lesson-plan`).
2. You will see the list of Dashakams in the current learning order.
3. Each entry shows the Dashakam number, name, and its position in the plan.

### How to change the order of Dashakams

1. Open the Lesson Plan page.
2. The order is defined in the Lesson Plan configuration.
3. To change the order, the admin must update the Lesson Plan data.
4. Save your changes.

> 💡 **TIP:** Consult with the teaching team before changing the Lesson Plan order, as it affects all users currently learning.

### Impact on the Learn With Me module

- When a user opens **Learn With Me**, the Dashakams appear in the Lesson Plan order.
- Changing the order will immediately affect all users.
- Users who are partway through the plan may find their progress position shifted.

---

## Section 10 — Common Tasks (Quick Reference)

### "I want to add a brand new Dashakam with all its verses"

1. Go to Admin Content Manager (`/admin/content`).
2. Enter the new **Dashakam Number** (e.g., `51`).
3. Set **Num Verses in Dashakam** (e.g., `10`).
4. Go to the **Dashakam** tab → Enter names in all required languages → Click **Save Dashakam Info**.
5. For each verse (1 through 10):
   a. Set the **Verse Number**.
   b. Go to **Audio** tab → Upload Chant and Learn audio files.
   c. Go to **Image** tab → Set the image file name and upload.
   d. Go to **Scripts** tab → Enter transliterations in all required languages → Save.
   e. Go to **Translations** tab → Enter translations → Save.
   f. Go to **Metadata** tab → Set Bell/Arathi/Prasadam → Save.

### "I want to add a new verse to an existing Dashakam"

1. Select the Dashakam number.
2. Enter the new **Verse Number** (the next number after existing verses).
3. Update **Num Verses in Dashakam** to include the new verse.
4. Fill in all tabs (Audio, Image, Scripts, Translations, Metadata) for the new verse.
5. Save each tab.

### "I want to change the translation of a verse"

1. Select the **Dashakam** and **Verse** number.
2. Click the **Translations** tab.
3. Click the **language button** for the language you want to change (e.g., Tamil).
4. Edit the text.
5. Click **Save Translation**.

### "I want to add a Slokam to a verse"

1. Select the **Dashakam** and **Verse** number.
2. Click the **Scripts** tab.
3. Scroll down to **Special Slokam** section.
4. Enter the Slokam text in each required language.
5. Click **Save Scripts**.

### "I want to upload a new audio file and link it to a verse"

1. Select the **Dashakam** and **Verse** number.
2. Click the **Audio** tab.
3. Select the variant (**Chant/Podcast** or **Learn**).
4. Verify the expected file name displayed.
5. Click **Choose File** and select the audio file.
6. Click **Upload Audio**.

### "I want to turn on the Bell for a specific verse"

1. Select the **Dashakam** and **Verse** number.
2. Click the **Metadata** tab.
3. Find the **Bell** toggle.
4. Turn it **ON** (the toggle should show as active/colored).
5. Click **Save Metadata**.

### "I want to add a Prasadam name to a verse"

1. Select the **Dashakam** and **Verse** number.
2. Click the **Metadata** tab.
3. Find the **Prasadam Name** section.
4. Click each language button and enter the Prasadam name.
5. Click **Save Metadata**.

### "I want to change the image shown during chanting of a Dashakam"

1. Select the **Dashakam** number.
2. Click the **Image** tab.
3. Update the **Image File Name** field.
4. Upload the new image file.
5. Click **Upload Image**.

---

## Section 11 — Troubleshooting

### Audio is not playing in the app

| Possible Cause | Solution |
|----------------|----------|
| Wrong file name entered | Go to Admin → Audio tab → Verify the file name matches the naming convention exactly (e.g., `SL001-01.m4a`). |
| File not uploaded | Re-upload the audio file through the Admin panel. |
| Unsupported format | Convert the file to M4A or MP3 and re-upload. |
| Browser cache | Ask the user to hard-refresh (Ctrl+Shift+R or Cmd+Shift+R). |

### Image is not showing during playback

| Possible Cause | Solution |
|----------------|----------|
| Wrong image file name | Check the Image tab in Admin and correct the file name. |
| Image not uploaded | Upload the image through the Admin panel. |
| File too large | Resize the image to under 500 KB and re-upload. |
| Unsupported format | Convert to JPG, PNG, or WebP. |

### Translation is missing for a language

| Possible Cause | Solution |
|----------------|----------|
| Text not entered | Go to Admin → Translations tab → Select the language → Enter the text → Save. |
| Saved but not visible | Clear browser cache and refresh. Check if the language is supported in the current MVP. |

### Verse is not appearing in the app

| Possible Cause | Solution |
|----------------|----------|
| Verse not saved | Check that the verse data was saved in all required tabs. |
| Transliteration missing | At minimum, the English transliteration must be present. |
| Dashakam number mismatch | Verify the verse is assigned to the correct Dashakam number. |

### Bell is not ringing at end of verse

| Possible Cause | Solution |
|----------------|----------|
| Bell not enabled | Go to Admin → Metadata tab → Turn the **Bell** toggle ON → Save. |
| Bell audio file missing | Ensure the bell audio file exists in storage. |

### Sloka is not auto-playing

| Possible Cause | Solution |
|----------------|----------|
| Slokam text not entered | Go to Admin → Scripts tab → Enter Slokam text → Save. |
| Sloka audio file not uploaded | Upload the Sloka audio file with the correct name (e.g., `SL001-01_Sloka1.m4a`). |

### Admin panel is not loading

| Possible Cause | Solution |
|----------------|----------|
| Session expired | Log in again. |
| No admin access | Contact the team lead to verify your admin role. |
| Internet connection | Check your internet connection and try again. |
| Browser issue | Try a different browser or clear your cache. |

### Forgot admin password

1. Go to the login page.
2. Click **"Forgot Password?"**
3. Enter your admin email.
4. Check your email for the reset link.
5. Follow the link and set a new password.
6. Log in with the new password.

---

## Section 12 — Best Practices & Tips

💡 **Always double-check audio file names before saving.** A single typo (e.g., `SL01-01` instead of `SL001-01`) will prevent the audio from playing.

💡 **Complete all languages before publishing.** Finish English first (as the fallback), then complete Tamil, Sanskrit, and other languages.

💡 **Test each verse in the app after adding.** After saving a verse, open the app as a regular user and navigate to that verse in the Chant, Learn, and Script modules to verify everything works.

💡 **Keep a local backup of all audio files.** Store a copy of every audio and image file on your local computer or a shared drive, in case files need to be re-uploaded.

💡 **Never delete a Dashakam without checking with the team.** Deletion is permanent and affects all users immediately.

💡 **Regularly review content for accuracy.** Schedule periodic reviews of transliterations and translations, especially for languages you are less familiar with.

💡 **Use consistent formatting.** When entering transliterations, follow the same transliteration conventions throughout (e.g., IAST for Roman script).

💡 **Save frequently.** Save each tab after making changes. Don't navigate away without saving — unsaved changes will be lost.

💡 **Work Dashakam by Dashakam.** Complete all verses and all tabs for one Dashakam before moving to the next. This reduces errors and ensures nothing is missed.

---

## Section 13 — Glossary

| Term | Definition |
|------|-----------|
| **Dashakam** | A group of verses (typically 10) within the Narayaneeyam. There are 100 Dashakams in total. Think of it as a "chapter." |
| **Verse / Slokam** | A single prayer verse within a Dashakam. Each verse has its own text, audio, and translation. |
| **Transliteration** | The verse text written in a different script (e.g., Sanskrit written in Tamil letters). The sounds remain the same; only the script changes. |
| **Translation** | The meaning of a verse expressed in a different language (e.g., a Sanskrit verse's meaning written in English). |
| **Prasadam** | A sacred food offering associated with a verse or Dashakam. The name is displayed in the app so devotees know what to prepare. |
| **Arathi** | A Hindu worship ritual involving the waving of a lamp before a deity. When enabled for a verse, the app signals the devotee to perform Arathi. |
| **Bell** | A bell sound that plays at the end of certain verses during chanting, signaling a special or concluding moment. |
| **Audio File** | A sound recording of a verse being chanted. Used in the Chant and Podcast modules. Stored in M4A format. |
| **Learn Audio** | A special version of the audio file that includes built-in silence gaps between lines, allowing the devotee to repeat each line. Used in the Learn With Me module. |
| **Podcast** | A module in the app where devotees can listen to continuous chanting of verses, similar to a podcast episode. Uses the same audio as the Chant module. |
| **Lesson Plan** | The defined order in which Dashakams are presented in the Learn With Me module. May differ from the numerical order of Dashakams. |
| **CRUD** | An abbreviation for **C**reate, **R**ead, **U**pdate, **D**elete — the four basic operations for managing data. |
| **Admin Panel** | The section of the webapp accessible only to administrators, used to manage all content and settings. |

---

**End of Manual**

*For further assistance, contact the development team or refer to the in-app help resources.*
