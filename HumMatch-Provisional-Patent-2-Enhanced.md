# PROVISIONAL PATENT APPLICATION
**United States Patent and Trademark Office**

**Title of Invention:** System and Method for Multi-User Group Vocal Matching, Per-Song Compatibility Scoring, Transposition Guidance, Longitudinal Vocal Profile Tracking, Group Role Assignment, and Robust Vocal Sample Processing in Karaoke Recommendation Systems

**Related Filing:** Continuation of Provisional Application filed March 20, 2026 — System and Method for Vocal Timbre Analysis and Personalized Karaoke Song Matching

**Inventors:** Joseph Morin, Irvine, CA | Nora Betancourt, Newport Beach, CA

**Filing Basis:** Pro Se (Joseph Morin)

**Entity Status:** Micro Entity — Filing Fee: $65

---

## FIELD OF THE INVENTION

This invention relates to extensions of the voice analysis and karaoke recommendation system described in the related provisional filing of March 20, 2026. Specifically, this application covers: (1) group vocal matching for multiple simultaneous or asynchronous users; (2) per-song numerical compatibility scoring using multiple weighted vocal and contextual factors; (3) key transposition guidance for near-match songs; (4) longitudinal tracking of individual voice profiles over time; (5) group vocal role assignment; and (6) robust vocal sample processing in noisy or real-world venue environments.

---

## BACKGROUND

Existing karaoke song recommendation systems, including the system described in the related provisional application, address individual voice matching. No existing system provides a method for simultaneously or asynchronously profiling multiple users and generating song recommendations optimized for group compatibility using multiple selection algorithms. Similarly, no existing system combines per-song numerical compatibility scoring with timbral analysis using multiple weighted factors, provides key transposition guidance based on voice profile proximity, assigns vocal roles (lead, harmony, backup) to group members based on individual profiles, or tracks vocal characteristics longitudinally to identify improvement or health-relevant changes. No existing system incorporates robust sample-quality handling for real-world acoustic environments including venues with ambient noise, crowd noise, or PA system interference.

These extensions represent novel and non-obvious applications of the underlying voice profiling method.

---

## SUMMARY OF THE INVENTION

This application provides systems and methods for:

- Simultaneously or asynchronously receiving and processing voice profiles from a plurality of users to generate group-compatible song recommendations using one or more group-selection algorithms
- Computing and displaying per-song numerical compatibility scores based on multiple weighted vocal and contextual factors including range overlap, timbral similarity, pitch stability, difficulty, and user history
- Identifying near-match songs and calculating the key transposition interval required to bring them within a user's or group's vocal range, including transposition direction, magnitude, and quality implications
- Assigning vocal roles including lead singer, backup singer, harmony, verse assignment, and section-specific assignments to individual group members based on their respective voice profiles
- Storing and comparing multiple voice profiles for a single user over time to detect vocal development, fatigue, or health-relevant changes
- Processing hummed vocal samples captured in real-world acoustic environments including noise filtering, sample quality assessment, and guided recapture prompts

---

## CLAIMS

### Independent Claims

**Claim 14.** The method of claim 1 of the related provisional application (filed March 20, 2026), further comprising computing and displaying a per-song compatibility score for each song recommendation, wherein said score reflects one or more of the following weighted factors visible to the user:

- Vocal range overlap between the user's detected range and the song's required range
- Timbral similarity as measured by spectral centroid proximity
- Pitch stability or consistency score derived from the captured hummed sample
- Tessitura fit, defined as the density of notes in the song falling within the user's most comfortable sub-range
- Sustained note burden, reflecting the proportion of notes held beyond a defined duration threshold
- High-note density, reflecting the proportion of notes in the upper quartile of the user's range
- Song difficulty level as a composite of the above factors
- User feedback history from prior song selections or dismissals
- Language preference or genre alignment
- Whether key transposition is required to achieve compatibility, and the magnitude of such transposition

Said score expressed as a visible numerical percentage or categorical rating for each individual song recommendation.

**Claim 15.** The method of claim 1 of the related provisional application, further comprising:

- Identifying songs outside the user's detected vocal range by a defined proximity threshold
- Computing a recommended key transposition interval for each near-match song, expressed in semitones, sufficient to bring said song within the user's comfortable range
- Specifying transposition direction as upward or downward relative to the original key
- Computing a minimum transposition needed to achieve compatibility and a maximum allowable transposition beyond which song quality or recognizability degrades
- Distinguishing songs where transposition is safe from songs where transposition may degrade quality
- Recommending alternate official key versions of a song where available as an alternative to computed transposition
- Ranking near-match songs by transposition burden, presenting lower-burden transpositions preferentially
- In group mode, computing a compromise transposition minimizing collective transposition burden across all group members
- Presenting near-match songs alongside their computed transposition guidance as a secondary recommendation tier, distinguishable from primary in-range recommendations

**Claim 16.** A method for generating group karaoke song recommendations for a plurality of users comprising:

- Receiving, via one or more microphone inputs, individual hummed vocal samples from two or more users, wherein said samples may be received simultaneously, sequentially, or asynchronously across different sessions or time periods
- Supporting group formation via shared session rooms, invite links, venue table QR codes, temporary event rooms, or sequential profile submission where users join a group session over time
- Generating an individual voice profile for each user as recited in claim 1 of the related provisional application, comprising a fundamental frequency range and spectral timbral characteristics
- Computing group-compatible song recommendations using one or more of the following selection methods:
  - Strict intersection of songs compatible with all group members
  - Weighted average compatibility across all group members
  - Minimum threshold compatibility, accepting songs meeting a defined minimum score for all members
  - Max-min fairness optimization, maximizing the minimum compatibility score across all members
  - Pairwise compatibility clustering, grouping members by vocal similarity and recommending per-cluster songs
  - Leader-plus-support model, wherein one designated member's profile is primary and others are secondary
  - Exclusion of outlier profiles with optional "good for most" mode when full group compatibility is not achievable
- Generating a ranked list of group-compatible songs and presenting said list to users as a shared karaoke recommendation
- Continuously updating group recommendations as additional users submit profiles asynchronously

**Claim 17.** A method for longitudinal vocal profile tracking comprising:

- Storing a plurality of timestamped individual voice profiles for a single user, each comprising one or more acoustic descriptors selected from: fundamental frequency range, spectral centroid, spectral rolloff, mel-frequency cepstral coefficients (MFCCs), harmonic-to-noise ratio, vibrato stability, pitch jitter or consistency metrics, formant-related measures, resonance profile, and any combination thereof
- Comparing voice profiles across sessions using confidence-weighted comparisons, wherein profiles captured under low-quality acoustic conditions are weighted less heavily in trend analysis
- Computing improvement metrics reflecting positive changes in range or timbral stability over rolling time windows, normalized per user baseline
- Computing a vocal readiness score for each session reflecting the user's current vocal state relative to their established baseline
- Computing a recovery score following sessions where strain or degradation was detected
- Tagging sessions with contextual metadata where available or user-supplied, including time of day, self-reported illness, venue noise level, self-reported alcohol use, self-reported fatigue level, and whether a vocal warmup was performed
- Detecting anomalous deviations that fall outside expected variance for that user, distinguishing genuine change from measurement noise
- Generating wellness indicators when detected changes in voice profile fall outside defined thresholds, presented to the user as informational signals with prominent disclosure that such indicators do not constitute medical advice and are not a substitute for professional evaluation
- Supporting an optional coach or clinician export mode, wherein longitudinal profile data may be exported in a structured format for use by a qualified vocal professional or clinician

**Claim 21.** A method for assigning vocal roles to members of a group karaoke session comprising:

- Receiving individual voice profiles for two or more users as recited in claim 16
- Analyzing each profile to determine vocal range, timbral characteristics, and relative profile position within the group
- Assigning one or more of the following roles to each group member based on their profile:
  - Lead singer: the member whose profile best matches the primary melody range of a recommended song
  - Backup singer: members whose profiles support secondary or harmony parts
  - Verse assignment: designating which group member should perform defined verse or chorus sections based on section-specific range requirements
  - High chorus assignment: identifying the member best suited for high-range chorus sections
  - Harmony role: identifying members whose timbral characteristics and range suggest harmonic compatibility with the lead
  - Duet, trio, or quartet role assignment with part splitting by vocal range
- Presenting role assignments alongside group song recommendations as visual indicators per group member

**Claim 22.** A method for robust vocal sample capture and quality assessment in real-world acoustic environments comprising:

- Assessing signal quality of each captured hummed sample using one or more of the following metrics: root mean square signal level, signal-to-noise ratio, pitch detection confidence score, sample duration, and frequency stability across the capture window
- Rejecting samples falling below defined quality thresholds and prompting the user to recapture with guidance specific to the detected quality failure, including instructions such as "move to a quieter area," "hum louder," or "hold the note steadier"
- Applying noise filtering or frequency gating to captured samples to reduce ambient noise interference from venue environments including crowd noise, music playback, and PA systems
- Weighting pitch detection results by signal confidence to reduce the influence of low-confidence pitch readings on the final voice profile
- Tracking sample quality scores across captures and using quality metrics as a factor in compatibility score confidence reporting

### Dependent Claims

**Claim 18.** The method of claim 16, wherein group-compatible song recommendations are further filtered against a live venue karaoke catalog API as recited in claim 5 of the related provisional application, returning only group-compatible songs available in the venue's active catalog.

**Claim 19.** The method of claim 16, further comprising generating a shared social challenge invitation wherein the invitation reflects the group's collective voice profile results and invites additional users to submit voice profiles for inclusion in the group recommendation.

**Claim 20.** The method of claim 17, wherein longitudinal voice profile data is aggregated across a plurality of users with consent and applied to train machine learning models for vocal health assessment.

**Claim 23.** The method of claim 14, wherein per-song compatibility scores are further segmented by song section, providing section-specific compatibility indicators for verse, chorus, bridge, and instrumental sections, enabling a user to identify which portions of a song fall within or outside their comfortable range.

**Claim 24.** The method of claim 16, wherein group session formation supports asynchronous participation across geographic locations, enabling users not physically co-located to submit voice profiles and receive group-compatible song recommendations for a planned shared karaoke event.

**Claim 25.** The method of claim 22, wherein vocal sample quality metrics are presented to the user as a visual confidence indicator during or after capture, and wherein low-confidence captures are flagged in the resulting voice profile and compatibility scores are adjusted to reflect reduced measurement certainty.

---

## BRIEF DESCRIPTION OF PREFERRED EMBODIMENTS

**Group Matching (Claim 16):** In a preferred embodiment, a karaoke venue deploys HumMatch at shared tables via QR code. Each patron completes the three-phase humming test on their individual device sequentially over a period of several minutes as they arrive at the table. The system continuously updates group recommendations as each new profile is submitted. Songs are ranked using weighted average compatibility with optional filtering against the venue's live catalog. A fallback "good for most" mode is activated when one member's profile is a significant outlier.

**Transposition (Claim 15):** A user whose voice profile places them slightly outside the range of a desired song receives a notification that the song is a near-match, along with a recommended key transposition (e.g., "Lower by 3 semitones") and a quality indicator (e.g., "Safe to transpose — song works well in this key"). Songs requiring transposition beyond a defined threshold are flagged as "may affect feel of the song."

**Role Assignment (Claim 21):** In a group of four users, the system identifies that User A has the highest range and assigns them the lead chorus role; User B has a compatible but lower range and is assigned verse sections; Users C and D have similar mid-range profiles and are assigned harmony support roles. The recommendation interface displays each user's assigned role alongside compatible songs.

**Noisy Environment (Claim 22):** In a venue with ambient music, the system detects a low signal-to-noise ratio during capture, rejects the sample, and displays the guidance: "It's a bit noisy here — try humming louder or move to a quieter spot." Upon recapture, the system applies frequency gating to reduce low-frequency noise interference before pitch detection processing.

**Longitudinal Tracking (Claim 17):** A returning user's new voice profile is automatically compared to stored historical profiles. The system displays a vocal range development timeline and flags sessions where range or consistency metrics deviate significantly, optionally alerting the user to potential vocal fatigue.

**Claim 26.** A method for generating explainable song recommendations comprising:

- Generating for each recommended song a human-readable explanation of why the song was recommended, including one or more of the following factors:
  - Vocal range fit, expressed as a percentage or qualitative descriptor
  - Timbral similarity to the user's detected vocal color
  - Whether transposition is required and the recommended interval
  - In group mode, which group members are most and least compatible with the song
  - The designated lead singer and role assignments for the group
  - Prior successful selections or positive feedback history
  - Song difficulty relative to the user's profile
- Presenting said explanations inline with each song recommendation in a user-readable format

**Claim 27.** The method of claim 22, further comprising:

- Applying device-to-device variance normalization to account for differences in microphone frequency response, gain characteristics, and sensitivity across different device models
- Calibrating the system's frequency detection thresholds based on an initial device characterization step, wherein the user produces a reference tone or hum used to establish device-specific normalization factors
- Offering a quiet-mode fallback wherein the user is prompted to use wired headphones with an integrated microphone, and wherein the system applies different sample quality thresholds appropriate for near-field headphone capture versus ambient device microphone capture

---

## DETAILED DESCRIPTION OF PREFERRED EMBODIMENTS

### A. Session-Based Group Formation

In one embodiment, a group session is initiated when a first user generates a voice profile and selects "Start Group Session." The system creates a temporary session with a unique identifier accessible via QR code or shareable link. As additional users scan the QR code or open the link, they are prompted to complete the three-phase humming test. The system updates the group recommendation list dynamically after each new profile is added. The session may be time-limited (e.g., expires after 2 hours) or venue-specific (linked to a venue table identifier). Users may join asynchronously from separate physical locations, enabling remote group karaoke planning.

When a user's profile is a significant outlier relative to the group (e.g., a very low bass voice in a group of sopranos), the system activates "good for most" mode, which presents the best songs for the remaining group members while offering the outlier user a parallel individual recommendation list. The outlier designation is not shown to the group to avoid social friction; the system silently adjusts the recommendation set.

### B. Role-Based Recommendation with Part Assignment

In one embodiment for a group of three users with profiles designated User A (tenor), User B (baritone), and User C (soprano), the system processes a song with a primary melody in the tenor range, a harmony part in the baritone range, and a high chorus in the soprano range. The system assigns: User A as lead vocalist, User B as harmony support, and User C as high chorus vocalist. This assignment is displayed per song in the recommendation interface, showing each user their designated role. For songs where all parts fall within a similar range, the system designates a shared or unassigned role.

### C. Multi-Factor Compatibility Scoring

In one embodiment, the per-song compatibility score is computed as a weighted sum of the following normalized factors, where weights may be adjusted by the system based on user feedback history:

- Range overlap (W1): proportion of song notes within the user's detected comfortable range
- Tessitura fit (W2): proportion of song notes within the user's most frequently occupied range sub-band
- Timbral proximity (W3): proximity of the user's spectral centroid to the centroid associated with the song's recommended voice type
- Difficulty penalty (W4): inverse of song difficulty score, reducing scores for songs with high sustained-note burden or high-note density
- Confidence modifier (W5): multiplier derived from sample capture quality, reducing the weight of scores derived from low-confidence captures
- Transposition penalty (W6): reduction applied when transposition is required, scaled by transposition magnitude
- Feedback boost (W7): additive bonus applied to songs in categories previously selected or positively rated by the user

The resulting score is normalized to a 0–100 scale and displayed as a percentage or star rating. The system may display the top contributing factors to the user as part of the explainable output (see Claim 26).

### D. Confidence and Quality Gating

In one embodiment, each phase of the three-phase humming test produces a confidence score based on: the RMS signal level relative to ambient noise, the proportion of pitch detection frames that returned a confident result above a defined autocorrelation threshold, the frequency stability measured as variance in detected pitch across the capture window, and the duration of usable signal within the capture window. Samples falling below a minimum confidence threshold on any metric are rejected. The user receives specific guidance: if signal level is low, the prompt reads "Hum a bit louder"; if stability is low, the prompt reads "Try to hold the note steady"; if ambient noise is detected above threshold, the prompt reads "It's noisy here — try moving somewhere quieter or using headphones." The final voice profile includes a per-phase confidence score that propagates into the compatibility score confidence modifier described in Claim 14.

### E. Explainable Recommendation Output

In one embodiment, each song recommendation card displays a brief explanation below the song title. Examples of generated explanations include: "Your range matches 92% of this song's notes — strong fit across all sections," "This song is slightly high for your range but works well lowered by 2 semitones," "Best match for your vocal color — similar warmth to the artist's style," "Great for your group — [User A] takes the verses, [User C] leads the chorus," and "You've matched well to this artist before." These explanations are generated programmatically from the scoring factors and do not require generative AI. They serve both as user-facing differentiation and as a foundation for future claim family expansion around explainable recommendation systems.

### F. Longitudinal Tracking with Contextual Tagging

In one embodiment, a user who has completed five or more sessions over 30 days is shown a vocal range timeline displaying their detected low and high note across each session. Sessions tagged with self-reported illness show as grayed-out data points excluded from the baseline trend. A session where the user's high note dropped significantly from their recent baseline triggers a vocal readiness score of "Below your usual level today — your voice may be tired or under stress. This is for your awareness only and is not medical advice." The user may optionally export their longitudinal profile in JSON format for sharing with a vocal coach or clinician.

---

## BRIEF DESCRIPTION OF DRAWINGS

The following drawings are intended to be included with the non-provisional filing and are described here for the record:

**Figure 1 — Group Session Formation Flow:** Illustrates the process by which a group session is initiated, a QR code or invite link is generated, users join and complete voice profiles asynchronously, and group recommendations are updated dynamically.

**Figure 2 — Per-Song Compatibility Scoring Flow:** Illustrates the computation of a per-song compatibility score from weighted acoustic features, confidence modifier, and contextual factors, resulting in a normalized percentage score displayed per song.

**Figure 3 — Transposition Guidance Flow:** Illustrates how near-match songs are identified, the transposition interval is computed, quality implications are assessed, and the transposition recommendation is presented in the UI as a secondary recommendation tier.

**Figure 4 — Longitudinal Tracking Timeline View:** Illustrates a user-facing vocal profile timeline displaying per-session low/high note range, confidence level, contextual tags, vocal readiness score, and trend line over rolling 30-day window.

**Figure 5 — Group Role Assignment Example:** Illustrates a four-user group session with individual voice profiles displayed, role assignments per song (lead, harmony, verse, chorus), and the shared group recommendation list.

**Figure 6 — Venue Table QR Session Architecture:** Illustrates the physical deployment model where a venue table QR code links to a group session, patrons join sequentially, profiles are submitted asynchronously, and the group recommendation list is visible on a shared display.

**Figure 7 — Sample Quality Assessment and Retake Flow:** Illustrates the capture pipeline including signal level check, SNR assessment, pitch detection confidence scoring, quality threshold gating, user guidance prompts, and device normalization.

---

## NOTES FOR FILING

- File at patentcenter.uspto.gov
- Application type: Utility — Provisional
- Entity status: Micro Entity ($65 fee)
- Inventors: Joseph Morin (Irvine, CA) + Nora Betancourt (Newport Beach, CA)
- Filing deadline for non-provisional: 12 months from filing date of original provisional (March 20, 2027)
- This enhanced provisional supersedes the prior draft and should be filed in place of it
