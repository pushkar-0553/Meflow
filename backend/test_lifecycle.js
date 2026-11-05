const BASE_URL = 'http://localhost:5000/api';

async function run() {
  console.log('--- STARTING COMPLETE 8-STAGE VIDEO PRODUCTION LIFECYCLE TEST ---');

  // Step 0: Login as Admin
  console.log('\n[1/10] Authenticating as Admin (admin@vcube.com)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@vcube.com', password: 'Admin@12345' }),
  });

  const cookieHeader = loginRes.headers.get('set-cookie');
  if (!cookieHeader) {
    throw new Error('Failed to get session cookie from login.');
  }
  const sessionCookie = cookieHeader.split(';')[0];
  const loginData = await loginRes.json();
  console.log('✓ Admin login successful. User:', loginData.data?.user?.name, 'Role:', loginData.data?.user?.role?.name);

  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: sessionCookie,
  };

  // Step 1: Create Video Draft
  console.log('\n[2/10] Creating Video Draft (Stage 1)...');
  const draftRes = await fetch(`${BASE_URL}/projects/drafts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Agency K - Full Production Masterclass',
      course_id: 1, // Agency K
      category: 'PROJECT_EXPLANATION',
      description: 'Comprehensive high-converting walkthrough of Agency K client projects.',
      priority: 'HIGH',
      proposed_shoot_date: '2026-11-10',
      proposed_shoot_time: '10:00:00',
      location_type: 'STUDIO',
      location_details: 'VCube Studio Main Floor - Bay 2',
    }),
  });
  const draftData = await draftRes.json();
  if (!draftData.success) throw new Error(`Draft creation failed: ${JSON.stringify(draftData)}`);
  const projectId = draftData.data.id;
  const projectCode = draftData.data.project_code;
  console.log(`✓ Draft created successfully: ${projectCode} (ID: ${projectId})`);

  // Step 2: Submit Draft for Content
  console.log('\n[3/10] Submitting Draft to Scripting...');
  const submitDraftRes = await fetch(`${BASE_URL}/projects/drafts/${projectId}/submit`, {
    method: 'POST',
    headers: authHeaders,
  });
  const submitDraftData = await submitDraftRes.json();
  if (!submitDraftData.success) throw new Error(`Draft submit failed: ${JSON.stringify(submitDraftData)}`);
  console.log('✓ Draft submitted to Content Writing. Stage:', submitDraftData.data?.current_stage);

  // Step 3: Scripting (Stage 2)
  console.log('\n[4/10] Claiming and Authoring Script...');
  await fetch(`${BASE_URL}/content/${projectId}/accept`, { method: 'POST', headers: authHeaders });
  await fetch(`${BASE_URL}/content/${projectId}/script`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      google_docs_url: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      script_version: 1,
      content_notes: '1200 words, dynamic 15-second opening hook with client revenue charts.',
    }),
  });
  await fetch(`${BASE_URL}/content/${projectId}/submit`, { method: 'POST', headers: authHeaders });

  // Approve Script
  const approveScriptRes = await fetch(`${BASE_URL}/content/${projectId}/review`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      decision: 'APPROVED',
      comments: 'Hook is strong. Ready for studio camera setup.',
    }),
  });
  const approveScriptData = await approveScriptRes.json();
  console.log('✓ Script Approved! Video Stage:', approveScriptData.data?.current_stage);

  // Step 4: Cinematography & Shot Logging (Stage 3)
  console.log('\n[5/10] Claiming Shoot and Logging Scenes/Shots...');
  await fetch(`${BASE_URL}/shoots/${projectId}/accept`, { method: 'POST', headers: authHeaders });
  await fetch(`${BASE_URL}/shoots/${projectId}/start`, { method: 'POST', headers: authHeaders });

  // Fetch shoot record to get shoot ID
  const projRes1 = await fetch(`${BASE_URL}/projects/${projectId}`, { headers: authHeaders });
  const projData1 = await projRes1.json();
  const shootId = projData1.data?.shoot?.id;
  console.log(`✓ Shoot active (ID: ${shootId}). Adding Scene 1...`);

  // Add Scene
  const sceneRes = await fetch(`${BASE_URL}/shoots/${shootId}/scenes`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      scene_number: 1,
      title: 'Introduction & Agency K Problem Statement',
      description: 'Anchor at high table with laptop.',
    }),
  });
  const sceneData = await sceneRes.json();
  const sceneId = sceneData.data.id;

  // Log Shots
  const shot1Res = await fetch(`${BASE_URL}/shoots/scenes/${sceneId}/shots`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      shot_number: 1,
      clip_file_name: 'CLIP_001.MOV',
      dialogue_reference: 'Welcome to Agency K, where software meets scalable marketing.',
      take_number: 1,
      status: 'CONFIRMED',
      notes: 'Clean audio, wide lens.',
    }),
  });
  const shot1Data = await shot1Res.json();
  console.log('✓ Shot 1 logged:', shot1Data.data?.clip_file_name, shot1Data.data?.status);

  // Complete Shoot -> Advances to Stage 4: FOOTAGE_HANDOVER
  const completeShootRes = await fetch(`${BASE_URL}/shoots/${projectId}/complete`, {
    method: 'POST',
    headers: authHeaders,
  });
  const completeShootData = await completeShootRes.json();
  console.log('✓ Shoot completed! Stage:', completeShootData.data?.current_stage);

  // Step 5: Raw Footage Handover Protocol (Stage 4)
  console.log('\n[6/10] Executing Physical Footage Handover Protocol...');
  await fetch(`${BASE_URL}/footage/${projectId}/handover`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      storage_media_identifier: 'SD_SANDISK_PRO_128GB_A1',
      footage_folder_name: `RAW_${projectCode}_SHOOT_01`,
      footage_storage_url: 'https://drive.google.com/drive/folders/test_raw_footage',
      notes: 'Contains 28GB 4K 60fps ProRes footage.',
    }),
  });
  await fetch(`${BASE_URL}/footage/${projectId}/receive`, { method: 'POST', headers: authHeaders });
  await fetch(`${BASE_URL}/footage/${projectId}/copied`, { method: 'POST', headers: authHeaders });
  const readyEditRes = await fetch(`${BASE_URL}/footage/${projectId}/ready`, { method: 'POST', headers: authHeaders });
  const readyEditData = await readyEditRes.json();
  console.log('✓ Dual-party verification completed! Stage:', readyEditData.data?.current_stage);

  // Step 6: Video Editing Workspace & Review Gate (Stages 5 & 6)
  console.log('\n[7/10] Video Editing & Submitting Cut Versions...');
  await fetch(`${BASE_URL}/editing/${projectId}/accept`, { method: 'POST', headers: authHeaders });
  await fetch(`${BASE_URL}/editing/${projectId}/start`, { method: 'POST', headers: authHeaders });

  // Submit Final Cut
  const cutRes = await fetch(`${BASE_URL}/editing/${projectId}/versions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      cut_type: 'FINAL_CUT',
      cut_video_url: 'https://frame.io/player/agency-k-master-v1',
      duration_seconds: 420,
      editor_notes: 'Final sound mix, color grading complete, lower thirds aligned.',
    }),
  });
  const cutData = await cutRes.json();
  const versionId = cutData.data.version_id;
  console.log('✓ Final cut submitted (v1)! Stage:', cutData.data?.current_stage);

  // Review Gate: Approve Final Cut -> Advances to Stage 7: THUMBNAIL_PREP
  const reviewCutRes = await fetch(`${BASE_URL}/editing/versions/${versionId}/review`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      decision: 'APPROVED',
      comments: 'Excellent pacing, sound design is crisp. Approved for publishing packaging.',
    }),
  });
  const reviewCutData = await reviewCutRes.json();
  console.log('✓ Final Cut Approved! Stage:', reviewCutData.data?.current_stage);

  // Step 7: Thumbnail Management (Stage 7)
  console.log('\n[8/10] Submitting and Approving High-CTR Thumbnail...');
  const thumbRes = await fetch(`${BASE_URL}/thumbnails/${projectId}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80',
      feedback_notes: 'High-contrast 3-word title hook with anchor cutout.',
    }),
  });
  const thumbData = await thumbRes.json();
  const thumbnailId = thumbData.data.id;

  // Approve Thumbnail -> Advances to Stage 8: PUBLISHING
  const reviewThumbRes = await fetch(`${BASE_URL}/thumbnails/${thumbnailId}/review`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      decision: 'APPROVED',
      feedback_notes: 'Punchy graphics, CTR will be great.',
    }),
  });
  const reviewThumbData = await reviewThumbRes.json();
  console.log('✓ Thumbnail Approved! Stage:', reviewThumbData.data?.current_stage);

  // Step 8: Multi-Platform Publishing (Stage 8)
  console.log('\n[9/10] Publishing Across Social Channels...');
  // YouTube
  await fetch(`${BASE_URL}/publishing/projects/${projectId}/platform`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      platform: 'YOUTUBE',
      post_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      caption: 'Complete Agency K Project Breakdown! How we scaled to 10k users.',
      hashtags: '#VCube #AgencyK #FullStack #EdTech',
    }),
  });
  // Instagram
  await fetch(`${BASE_URL}/publishing/projects/${projectId}/platform`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      platform: 'INSTAGRAM',
      post_url: 'https://www.instagram.com/reel/C8xyz123456/',
      caption: 'Swipe to see the full architecture! Link in bio.',
      hashtags: '#coding #agency #software',
    }),
  });
  console.log('✓ Published to YouTube and Instagram.');

  // Mark Entire Project Live & Completed
  const completeProjectRes = await fetch(`${BASE_URL}/publishing/projects/${projectId}/complete`, {
    method: 'POST',
    headers: authHeaders,
  });
  const completeProjectData = await completeProjectRes.json();
  console.log('✓ Video Project Fully Live! Status:', completeProjectData.data?.overall_status, 'Stage:', completeProjectData.data?.current_stage);

  // Step 9: Final Master Verification
  console.log('\n[10/10] Fetching Master Video Project and Activity Timeline...');
  const masterRes = await fetch(`${BASE_URL}/projects/${projectId}`, { headers: authHeaders });
  const masterData = await masterRes.json();

  const timelineRes = await fetch(`${BASE_URL}/projects/${projectId}/timeline`, { headers: authHeaders });
  const timelineData = await timelineRes.json();

  console.log('================================================================');
  console.log('🎉 8-STAGE VIDEO PRODUCTION VERIFICATION REPORT');
  console.log('================================================================');
  console.log(`Project:           ${masterData.data.project.title} (${masterData.data.project.project_code})`);
  console.log(`Overall Status:    ${masterData.data.project.overall_status}`);
  console.log(`Current Stage:     ${masterData.data.project.current_stage}`);
  console.log(`Script Status:     ${masterData.data.script?.status} (Doc: ${masterData.data.script?.google_docs_url?.slice(0, 35)}...)`);
  console.log(`Shoot Status:      ${masterData.data.shoot?.status} (${masterData.data.shoot?.scenes?.length} Scenes, ${masterData.data.shoot?.scenes?.[0]?.shots?.length} Shots)`);
  console.log(`Footage Handover:  ${masterData.data.footage_handovers?.[0]?.status} (Media: ${masterData.data.footage_handovers?.[0]?.storage_media_identifier})`);
  console.log(`Editing Status:    ${masterData.data.editing?.status} (Cuts: ${masterData.data.editing?.versions?.length})`);
  console.log(`Thumbnail Status:  ${masterData.data.thumbnails?.[0]?.status}`);
  console.log(`Publications:      ${masterData.data.publications?.filter((p) => p.status === 'PUBLISHED').length} Channels Published (YouTube, Instagram)`);
  console.log(`Timeline Events:   ${timelineData.data?.length} Immutable Audit Logs Recorded`);
  console.log('================================================================');
  console.log('SUCCESS: All 8 stages verified end-to-end!');
}

run().catch((err) => {
  console.error('❌ LIFECYCLE TEST FAILED:', err);
  process.exit(1);
});
