# PROVISIONAL PATENT APPLICATION
**United States Patent and Trademark Office**

**Title:** System and Method for Multi-User Group Vocal Matching, Per-Song Compatibility Scoring, Key Transposition Guidance, Longitudinal Vocal Profile Tracking, Group Role Assignment, Explainable Recommendation Output, and Robust Vocal Sample Processing in Karaoke Recommendation Systems

**Related Filing:** Continuation of Provisional Application filed March 20, 2026 — System and Method for Vocal Timbre Analysis and Personalized Karaoke Song Matching

**Inventors:** Joseph Morin, Irvine, CA | Nora Betancourt, Newport Beach, CA

**Filing Basis:** Pro Se (Joseph Morin)

**Entity Status:** Micro Entity

**Filing Fee:** $65

---

## FIELD OF THE INVENTION

This invention relates to extensions of the voice analysis and karaoke recommendation system described in the related provisional application filed March 20, 2026. The present application covers six areas: (1) group vocal matching for multiple users, whether simultaneous, sequential, remote, or asynchronous, using multiple group-selection algorithms; (2) per-song numerical compatibility scoring using multiple weighted vocal and contextual factors; (3) key transposition guidance for near-match songs; (4) longitudinal tracking of individual voice profiles over time using broad acoustic feature sets; (5) vocal role assignment for group members; and (6) robust vocal sample processing including noise handling, quality gating, device normalization, and explainable recommendation output.

---

## BACKGROUND

The related provisional application describes an individual voice matching system that captures hummed vocal samples, extracts fundamental frequency range and spectral timbral features, and generates ranked song recommendations personalized to a single user's voice. No prior art provides a unified system extending this approach to: group sessions with multiple users joining simultaneously, sequentially, asynchronously, or remotely; compatibility scoring combining multiple acoustic and contextual factors; transposition guidance with quality assessment; vocal role assignment within groups; longitudinal voice tracking with contextual metadata; or robust sample quality handling adapted to real-world noisy venue environments. The present application addresses each of these extensions.

---

## SUMMARY OF THE INVENTION

The present invention provides:

1. A method for group vocal matching that receives voice profiles from two or more users by any combination of simultaneous, sequential, asynchronous, remote, or stored-profile input, and generates group-compatible song recommendations using one or more selection algorithms.

2. A method for per-song compatibility scoring that computes a numerical or categorical compatibility score for each recommended song using multiple weighted acoustic and contextual factors.

3. A method for key transposition guidance that identifies near-match songs, computes the transposition interval needed to bring each song within a user's or group's vocal range, assesses transposition quality implications, and presents guidance in a secondary recommendation tier.

4. A method for longitudinal vocal profile tracking that stores timestamped profiles using broad acoustic feature sets, compares profiles across sessions with confidence weighting and contextual metadata, computes readiness and recovery scores, and presents wellness indicators with appropriate non-medical disclosure.

5. A method for group role assignment that designates lead, harmony, backup, verse, chorus, and part-specific roles to group members based on their individual voice profiles.

6. A method for robust vocal sample processing that assesses sample quality, applies noise filtering and device normalization, gates low-quality samples, and provides explainable recommendation output.

---

## DETAILED DESCRIPTION OF THE INVENTION

### Section I: Group Session Formation and Matching

Group sessions may be initiated by any one member generating a voice profile and selecting a group mode. The system creates a temporary session accessible by QR code, invite link, venue table identifier, or event code. Users join the session and submit voice profiles asynchronously over a defined session window. The system updates group recommendations dynamically as each new profile is added, without requiring all members to be present simultaneously.

Group formation modes include: (a) same-device sequential input, wherein multiple users hum on the same device one at a time; (b) multi-device simultaneous input, wherein users submit profiles from separate devices at the same time; (c) multi-device asynchronous input, wherein users submit profiles at different times within a session window; (d) remote group formation, wherein geographically dispersed users submit profiles independently and receive shared recommendations for a planned event; and (e) stored-profile group formation, wherein previously saved voice profiles are loaded and combined without requiring live capture.

Group-compatible recommendations are computed using one or more of the following algorithms: strict intersection of songs compatible with all members; weighted average compatibility across all member profiles; minimum-threshold compatibility requiring each song to meet a defined minimum score for all members; max-min fairness optimization maximizing the minimum individual score across the group; pairwise compatibility clustering grouping members by vocal similarity; a leader-plus-support model designating one member as primary; and a "good for most" fallback mode that excludes outlier profiles and presents the best result for the remaining group with a separate parallel list for the outlier member.

### Section II: Per-Song Compatibility Scoring

Each recommended song is assigned a numerical compatibility score computed as a weighted combination of one or more of the following factors:

- **Range overlap:** the proportion of the song's required notes falling within the user's detected comfortable vocal range
- **Tessitura fit:** the proportion of the song's notes falling within the user's most frequently occupied sub-range
- **Timbral proximity:** the closeness of the user's spectral centroid to the centroid profile associated with the song's recommended voice type
- **Pitch stability:** the consistency of the user's detected pitch across the capture window, derived from variance in autocorrelation-based pitch readings
- **Sustained note burden:** the proportion of the song's notes held beyond a defined duration threshold
- **High-note density:** the proportion of the song's notes in the upper quartile of the user's range
- **Difficulty composite:** a weighted combination of the above factors reflecting overall song challenge
- **User feedback history:** an additive factor reflecting prior selections, positive ratings, or dismissals by the user
- **Transposition penalty:** a reduction applied when key transposition is required, scaled by transposition magnitude
- **Sample confidence modifier:** a multiplier reducing score weight when the source voice profile was captured under low-quality conditions
- **Language and genre alignment:** an additive factor reflecting the user's language preference or genre history

The resulting score is normalized and displayed as a numerical percentage or categorical rating per song. Scores may be further segmented by song section, providing separate indicators for verse, chorus, bridge, and high-note sections.

### Section III: Key Transposition Guidance

The system identifies songs falling outside a user's detected vocal range within a defined proximity threshold. For each such near-match song, the system computes: the transposition direction (upward or downward); the minimum interval in semitones required to bring the song within the user's comfortable range; the maximum allowable transposition interval beyond which song quality, recognizability, or emotional character may degrade; and a quality classification (safe to transpose, marginal, or not recommended). Where available, the system may identify alternate official key versions of a song as a preferred alternative to computed transposition.

Near-match songs are ranked by transposition burden, with lower-burden transpositions presented preferentially. In group mode, the system computes a compromise transposition minimizing collective burden across all group members. Near-match songs are presented in a visually distinct secondary recommendation tier, clearly separated from primary in-range recommendations.

### Section IV: Longitudinal Vocal Profile Tracking

The system stores a plurality of timestamped voice profiles for each user. Each profile may include one or more of the following acoustic descriptors: fundamental frequency range (lowest and highest comfortable pitch); spectral centroid; spectral rolloff; mel-frequency cepstral coefficients (MFCCs); harmonic-to-noise ratio; vibrato stability; pitch jitter or consistency metrics; formant-related measures; resonance profile; and any combination thereof. This broad feature set ensures the system's longitudinal tracking is not limited to a narrow set of descriptors and may incorporate additional acoustic features as the system evolves.

Profiles are compared across sessions using confidence-weighted analysis, wherein profiles captured under poor acoustic conditions contribute less to trend calculations. Comparisons may be normalized to each user's individual baseline, preventing cross-user bias. Trend analysis may be performed over rolling time windows (e.g., 7 days, 30 days) to smooth short-term variance.

Sessions may be tagged with contextual metadata including: time of day; self-reported illness status; venue ambient noise level; self-reported fatigue level; self-reported alcohol consumption; and whether a vocal warmup was performed prior to the session. This metadata enables the system to distinguish context-driven variance from genuine vocal change.

The system computes a vocal readiness score for each session reflecting the user's current vocal state relative to their established baseline. Where prior strain was detected, the system may compute a recovery score indicating the degree to which the user's profile has returned toward baseline. Anomalous deviations falling outside expected variance thresholds trigger wellness indicators presented to the user with prominent disclosure that such indicators are informational only, do not constitute medical advice, and are not a substitute for professional evaluation.

An optional clinician or coach export mode permits the user to export longitudinal profile data in a structured format for use by a qualified vocal professional.

### Section V: Group Role Assignment

For each group-compatible song recommendation, the system analyzes individual member profiles to assign one or more vocal roles. Role assignment considers: each member's detected range relative to the song's section-specific range requirements; timbral proximity to the song's recommended voice type per section; and relative range position within the group.

Roles that may be assigned include: lead singer (the member whose profile best matches the primary melody across the song); verse vocalist (the member best suited for verse sections based on section-specific range); high chorus vocalist (the member best suited for high-range chorus sections); harmony vocalist (a member whose range and timbre suggest compatibility with the lead's assigned parts); backup vocalist (members providing secondary support); and duet, trio, or quartet part assignments with section splitting by vocal range.

Role assignments are displayed alongside each song recommendation in the group recommendation interface, presenting each member's designated role as a visual indicator per song.

### Section VI: Robust Sample Processing, Device Normalization, and Explainable Output

**Sample quality assessment.** Each captured hummed sample is assessed using one or more of the following quality metrics: root mean square signal level; signal-to-noise ratio; pitch detection confidence score derived from autocorrelation peak strength; sample duration; and frequency stability across the capture window. Samples falling below defined minimum thresholds on any metric are rejected. The user receives guidance specific to the detected failure: low signal level prompts "Hum a bit louder"; low stability prompts "Try to hold the note steady"; high ambient noise prompts "It's noisy here — try moving somewhere quieter or using headphones." Recapture may be attempted until a sample of sufficient quality is obtained or a maximum attempt count is reached.

**Noise filtering.** The system may apply frequency gating, bandpass filtering, or adaptive noise cancellation to captured samples prior to pitch detection, reducing the influence of ambient venue noise, crowd noise, music playback, and PA system interference.

**Device normalization.** The system accounts for device-to-device variance in microphone frequency response, gain characteristics, and sensitivity. A device characterization step may be performed during initial setup or derived from the first capture session, establishing device-specific normalization factors applied to subsequent captures. A quiet-mode fallback is available wherein users are prompted to use wired headphones with an integrated microphone; the system applies adjusted quality thresholds appropriate for near-field headphone capture.

**Confidence propagation.** Sample quality scores are propagated through the scoring pipeline as a confidence modifier, reducing the weight of compatibility scores derived from low-confidence captures. The resulting confidence level may be displayed to the user as a visual indicator alongside their voice profile and song recommendations.

**Explainable output.** For each recommended song, the system generates a human-readable explanation of why the song was recommended. Explanations are generated programmatically from scoring factors and may include: range fit expressed as a percentage or descriptor; timbral match characterization; transposition requirement and recommended interval; group compatibility summary including per-member fit; designated lead singer and role assignments; and prior usage or feedback signals. In group mode, explanations may identify which members are best and least matched to each song.

---

## CLAIMS

**Claim 14.** The method of claim 1 of the related provisional application (filed March 20, 2026), further comprising computing and displaying for each song recommendation a compatibility score reflecting a weighted combination of two or more of the following factors: vocal range overlap, tessitura fit, timbral proximity, pitch stability, sustained note burden, high-note density, song difficulty, user feedback history, transposition penalty, sample confidence modifier, and language or genre alignment, said score expressed as a numerical percentage or categorical rating visible to the user per song.

**Claim 15.** The method of claim 1 of the related provisional application, further comprising: identifying songs outside the user's vocal range by a defined proximity threshold; computing a transposition interval in semitones including direction, minimum required, and maximum allowable values; classifying transposition quality; ranking near-match songs by transposition burden; computing in group mode a compromise transposition minimizing collective burden; and presenting near-match songs as a visually distinct secondary recommendation tier.

**Claim 16.** A method for generating group karaoke song recommendations comprising: receiving voice profiles from two or more users via simultaneous, sequential, asynchronous, remote, or stored-profile input; supporting group session formation via QR code, invite link, venue table identifier, same-device sequential input, or stored-profile combination; generating individual voice profiles per user; computing group-compatible recommendations using one or more selection algorithms selected from strict intersection, weighted average, minimum threshold, max-min fairness, pairwise clustering, leader-plus-support, and good-for-most fallback; and dynamically updating recommendations as additional profiles are submitted.

**Claim 17.** A method for longitudinal vocal profile tracking comprising: storing timestamped voice profiles including one or more acoustic descriptors selected from fundamental frequency range, spectral centroid, spectral rolloff, MFCCs, harmonic-to-noise ratio, vibrato stability, pitch jitter, formant measures, and resonance profile; comparing profiles using confidence-weighted analysis normalized to per-user baseline over rolling time windows; tagging sessions with contextual metadata; computing vocal readiness and recovery scores; detecting anomalous deviations from expected variance; presenting wellness indicators with non-medical disclosure; and supporting optional clinician or coach export.

**Claim 18.** The method of claim 16, wherein group recommendations are filtered against a live venue karaoke catalog API, returning only songs available in the venue's active catalog.

**Claim 19.** The method of claim 16, further comprising generating a shared social challenge invitation reflecting the group's collective voice profile results.

**Claim 20.** The method of claim 17, wherein longitudinal profile data is aggregated across users with consent and applied to train machine learning models for vocal assessment.

**Claim 21.** A method for group vocal role assignment comprising: receiving individual voice profiles for two or more users; analyzing each profile against section-specific song range requirements; assigning one or more roles including lead singer, verse vocalist, high chorus vocalist, harmony vocalist, backup vocalist, and part-split duet or trio roles; and displaying role assignments alongside each group song recommendation.

**Claim 22.** A method for robust vocal sample processing comprising: assessing sample quality using signal level, SNR, pitch confidence, duration, and frequency stability; rejecting low-quality samples with specific user guidance; applying noise filtering or frequency gating; weighting pitch detection by signal confidence; applying device normalization including characterization and quiet-mode headphone fallback; and propagating confidence scores through the recommendation pipeline.

**Claim 23.** The method of claim 14, wherein compatibility scores are further segmented by song section, providing separate indicators for verse, chorus, bridge, and high-note sections.

**Claim 24.** The method of claim 16, wherein remote group session formation supports geographically dispersed users submitting profiles independently for a planned shared karaoke event.

**Claim 25.** The method of claim 22, wherein sample confidence is displayed to the user as a visual indicator and low-confidence profiles are flagged in the recommendation interface.

**Claim 26.** A method for explainable karaoke song recommendation comprising: generating for each recommended song a human-readable explanation derived programmatically from scoring factors including range fit, timbral match, transposition requirement, group member compatibility, role assignments, and prior usage signals; and displaying said explanation inline with each song recommendation.

**Claim 27.** The method of claim 22, further comprising: applying device-specific microphone normalization based on a characterization step; offering a quiet-mode fallback with near-field headphone capture and adjusted quality thresholds; and accounting for device-to-device variance in frequency response and gain characteristics.

---

## BRIEF DESCRIPTION OF DRAWINGS

**Figure 1 — Group Session Formation Flow:** Session initiation, QR/invite/table-ID generation, asynchronous multi-device profile submission, dynamic recommendation update, and good-for-most fallback activation.

**Figure 2 — Per-Song Compatibility Scoring Flow:** Input of acoustic features and contextual factors, weighted combination, confidence modifier application, normalization, score display, and section-level segmentation.

**Figure 3 — Transposition Guidance Flow:** Near-match identification, transposition interval computation, direction and quality classification, group compromise computation, and secondary tier display.

**Figure 4 — Longitudinal Tracking Timeline:** Per-session profile storage, confidence-weighted comparison, baseline normalization, contextual tag display, readiness and recovery score computation, anomaly detection, and wellness indicator presentation.

**Figure 5 — Group Role Assignment:** Individual profile analysis, section-specific range mapping, role designation per member per song, and role display in group recommendation interface.

**Figure 6 — Venue Table QR Session Architecture:** Physical deployment of QR codes, patron device connection, sequential asynchronous profile submission, group recommendation display on shared screen, and venue catalog integration.

**Figure 7 — Sample Quality Assessment and Device Normalization Flow:** Capture pipeline including signal level check, SNR assessment, pitch confidence scoring, quality gating, user guidance prompts, noise filtering, device characterization, quiet-mode fallback, and confidence propagation.

**Figure 8 — Viral Share Card Generation Flow:** Voice match result computation, client-side canvas rendering of branded image artifact, social sharing via native device share interface, and challenge invitation generation with pre-composed text.

---

## ADDITIONAL CLAIMS (Post-Filing Discovery — Added March 26, 2026)

**Claim 28.** A method for generating a shareable visual artifact from individual vocal analysis results, comprising: computing a voice match result including one or more of matched artist profile, voice type classification, vocal range assessment, and compatibility score; generating a visual image using client-side canvas rendering incorporating said results with branded design elements including artist name, match percentage, voice type label, and challenge branding; and presenting said image for social sharing via a native device share interface, wherein said image is generated entirely on the user's device without server-side rendering.

**Claim 29.** The method of claim 28, further comprising generating a challenge invitation incorporating the user's voice match result and a call-to-action for a named recipient to complete their own vocal analysis, said challenge invitation transmitted via the native device share interface with pre-composed challenge text referencing the original user's result, such that the challenge creates a viral referral loop wherein each new user is prompted to compare their vocal match result to the challenger's result.

**Claim 30.** The method of claim 1 of the related provisional application, further comprising: classifying each song recommendation into one of a plurality of named result tiers based on compatibility score thresholds, said tiers including at minimum a primary match tier, a secondary match tier, a stretch tier indicating songs reachable with modest vocal effort, a duet-optimized tier, and a transposition-recommended tier; and displaying a named label and visual indicator for each tier inline with each song recommendation, wherein said labels are generated programmatically from the underlying compatibility score and transposition analysis.

---

## NOTES FOR FILING

- File at: **patentcenter.uspto.gov**
- Application type: Utility, Provisional
- Entity status: Micro Entity ($65 fee)
- Inventors: Joseph Morin (Irvine, CA) + Nora Betancourt (Newport Beach, CA)
- This document supersedes `HumMatch-Provisional-Patent-2.docx` and `HumMatch-Provisional-Patent-2-Enhanced.md`
- Non-provisional deadline: 12 months from the filing date of the original provisional (March 20, 2027)
- Drawings should be prepared before non-provisional filing; described in Figures 1–7 above
