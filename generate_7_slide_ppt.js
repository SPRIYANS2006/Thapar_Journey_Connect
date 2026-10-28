import pptxgen from 'pptxgenjs';
import path from 'path';

const pptx = new pptxgen();

// Set presentation layout: 16:9 widescreen
pptx.layout = 'LAYOUT_16x9';
pptx.author = 'Thapar Institute of Engineering & Technology (TIET)';
pptx.company = 'TIET Capstone Project';
pptx.title = 'Thapar Journey Connect & City Communities Presentation';

const SCREENSHOT_DIR = path.resolve('screenshots');

// Modern Color Palette
const C = {
  navyDark: '0F172A',
  bluePrimary: '1D4ED8',
  blueLight: 'EFF6FF',
  indigo: '4338CA',
  slateDark: '1E293B',
  slateGray: '475569',
  slateLight: 'F8FAFC',
  white: 'FFFFFF',
  emerald: '059669',
  cardBg: 'F1F5F9',
  border: 'CBD5E1'
};

// ==========================================
// SLIDE 1: Title & Project Overview
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: C.navyDark };

  // Decorative Accent Bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 0.8,
    w: 0.15,
    h: 5.4,
    fill: { color: C.bluePrimary }
  });

  // Category Tag
  slide.addText('THAPAR INSTITUTE OF ENGINEERING & TECHNOLOGY (TIET), PATIALA', {
    x: 1.2,
    y: 0.9,
    w: 11.5,
    h: 0.4,
    fontSize: 13,
    fontFace: 'Arial',
    color: '93C5FD',
    bold: true
  });

  // Main Heading
  slide.addText('Thapar Journey Connect\n& City Communities', {
    x: 1.2,
    y: 1.4,
    w: 6.8,
    h: 2.0,
    fontSize: 34,
    fontFace: 'Arial',
    color: C.white,
    bold: true,
    lineSpacing: 38
  });

  // Subtitle / Pitch
  slide.addText(
    'A campus-exclusive web platform connecting TIET hostellers with hometown peers and compatible travel partners for safe, affordable cab and train sharing.',
    {
      x: 1.2,
      y: 3.6,
      w: 6.5,
      h: 1.2,
      fontSize: 14,
      fontFace: 'Arial',
      color: 'CBD5E1',
      lineSpacing: 18
    }
  );

  // Key Pillars Badges
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.2,
    y: 5.1,
    w: 2.1,
    h: 0.8,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: '3B82F6', width: 1 }
  });
  slide.addText('Verified Students\n@thapar.edu only', {
    x: 1.2,
    y: 5.15,
    w: 2.1,
    h: 0.7,
    fontSize: 10,
    color: C.white,
    align: 'center',
    bold: true
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 3.5,
    y: 5.1,
    w: 2.1,
    h: 0.8,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: '10B981', width: 1 }
  });
  slide.addText('Single-Community\nRegional Hubs', {
    x: 3.5,
    y: 5.15,
    w: 2.1,
    h: 0.7,
    fontSize: 10,
    color: C.white,
    align: 'center',
    bold: true
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.8,
    y: 5.1,
    w: 2.1,
    h: 0.8,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: 'F59E0B', width: 1 }
  });
  slide.addText('Smart Match Engine\nTime & Hostel Proximity', {
    x: 5.8,
    y: 5.15,
    w: 2.1,
    h: 0.7,
    fontSize: 10,
    color: C.white,
    align: 'center',
    bold: true
  });

  // Website Screenshot on Right
  slide.addImage({
    path: path.join(SCREENSHOT_DIR, '3_dashboard.png'),
    x: 8.2,
    y: 1.1,
    w: 4.8,
    h: 5.1,
    sizing: { type: 'contain' }
  });
}

// ==========================================
// SLIDE 2: Problem Statement & Authentication
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: C.slateLight };

  slide.addText('STUDENT VERIFICATION & SECURITY', {
    x: 0.8,
    y: 0.5,
    w: 11,
    h: 0.3,
    fontSize: 11,
    color: C.bluePrimary,
    bold: true
  });

  slide.addText('Verified Campus Access: Eliminating Anonymous Travel', {
    x: 0.8,
    y: 0.8,
    w: 11,
    h: 0.6,
    fontSize: 24,
    color: C.navyDark,
    bold: true
  });

  // Left Content - Bullet points
  const points = [
    {
      title: 'Real Student Problem at TIET Patiala:',
      desc: 'Over 8,000+ hostellers commute each weekend to Patiala Railway Station, Bus Stand, and Chandigarh/Delhi Airports. Uncoordinated travel leads to high cab costs (₹1,500+ for airports) and safety concerns on unverified social channels.'
    },
    {
      title: 'Institutional Domain Restriction:',
      desc: 'The platform strictly enforces official "@thapar.edu" student email authentication with password & student session verification, blocking outside strangers.'
    },
    {
      title: 'Hostel Proximity Integration:',
      desc: 'Every student profile tracks academic program, current hostel (H1 to H15, Hostel D to Q, PG Quad), and emergency contact phone number.'
    }
  ];

  let currY = 1.6;
  points.forEach((pt) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: currY,
      w: 6.2,
      h: 1.5,
      rectRadius: 0.08,
      fill: { color: C.white },
      line: { color: C.border, width: 1 }
    });

    slide.addText(pt.title, {
      x: 1.0,
      y: currY + 0.15,
      w: 5.8,
      h: 0.35,
      fontSize: 12,
      color: C.bluePrimary,
      bold: true
    });

    slide.addText(pt.desc, {
      x: 1.0,
      y: currY + 0.55,
      w: 5.8,
      h: 0.85,
      fontSize: 10,
      color: C.slateGray,
      lineSpacing: 14
    });

    currY += 1.7;
  });

  // Screenshot on Right: Auth Page
  slide.addImage({
    path: path.join(SCREENSHOT_DIR, '1_auth_page.png'),
    x: 7.3,
    y: 1.6,
    w: 5.4,
    h: 5.0,
    sizing: { type: 'contain' }
  });
}

// ==========================================
// SLIDE 3: Interactive Student Dashboard
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: C.slateLight };

  slide.addText('CORE STUDENT PORTAL', {
    x: 0.8,
    y: 0.5,
    w: 11,
    h: 0.3,
    fontSize: 11,
    color: C.bluePrimary,
    bold: true
  });

  slide.addText('Student Dashboard & 4 Core Transit Hubs', {
    x: 0.8,
    y: 0.8,
    w: 11,
    h: 0.6,
    fontSize: 24,
    color: C.navyDark,
    bold: true
  });

  // Screenshot on Left
  slide.addImage({
    path: path.join(SCREENSHOT_DIR, '3_dashboard.png'),
    x: 0.8,
    y: 1.6,
    w: 6.4,
    h: 5.0,
    sizing: { type: 'contain' }
  });

  // Right Side Cards
  const hubs = [
    {
      name: 'Patiala Railway Station',
      dist: '8.5 km from Main Gate',
      fare: '₹150 - ₹200 cab / auto',
      detail: 'Peak Friday & Sunday evening trains (Shatabdi & Intercity).'
    },
    {
      name: 'Patiala Bus Stand',
      dist: '6.2 km from Main Gate',
      fare: '₹120 - ₹160 cab / auto',
      detail: 'Morning & evening PRTC Volvo & direct state buses.'
    },
    {
      name: 'Chandigarh Airport (IXC)',
      dist: '62 km via Zirakpur',
      fare: '₹1,200 - ₹1,500 cab',
      detail: 'Huge savings: 3-4 students split cab fare down to ₹350/person.'
    },
    {
      name: 'Delhi IGI Airport (DEL)',
      dist: '250 km via NH44',
      fare: '₹4,500 - ₹5,500 total',
      detail: 'Overnight cab carpools and holiday vacation departure groups.'
    }
  ];

  let rY = 1.6;
  hubs.forEach((hub) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.5,
      y: rY,
      w: 5.2,
      h: 1.15,
      rectRadius: 0.08,
      fill: { color: C.white },
      line: { color: C.border, width: 1 }
    });

    slide.addText(`${hub.name}`, {
      x: 7.7,
      y: rY + 0.1,
      w: 4.8,
      h: 0.3,
      fontSize: 12,
      color: C.navyDark,
      bold: true
    });

    slide.addText(`📍 ${hub.dist}  |  💰 ${hub.fare}`, {
      x: 7.7,
      y: rY + 0.4,
      w: 4.8,
      h: 0.25,
      fontSize: 10,
      color: C.bluePrimary,
      bold: true
    });

    slide.addText(hub.detail, {
      x: 7.7,
      y: rY + 0.65,
      w: 4.8,
      h: 0.4,
      fontSize: 9.5,
      color: C.slateGray
    });

    rY += 1.3;
  });
}

// ==========================================
// SLIDE 4: City Communities & Peer Hubs
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: C.slateLight };

  slide.addText('HOMETOWN NETWORKING & COHORTS', {
    x: 0.8,
    y: 0.5,
    w: 11,
    h: 0.3,
    fontSize: 11,
    color: C.bluePrimary,
    bold: true
  });

  slide.addText('City Communities & Discussion Notice Board', {
    x: 0.8,
    y: 0.8,
    w: 11,
    h: 0.6,
    fontSize: 24,
    color: C.navyDark,
    bold: true
  });

  // Screenshot on Right: Communities Page
  slide.addImage({
    path: path.join(SCREENSHOT_DIR, '4_communities.png'),
    x: 6.8,
    y: 1.6,
    w: 5.9,
    h: 5.0,
    sizing: { type: 'contain' }
  });

  // Left Side Features
  const commFeatures = [
    {
      title: 'Regional City Hubs:',
      desc: 'Dedicated communities for major student origins: Jalandhar (142 members), Delhi NCR (310 members), Ludhiana (185 members), Chandigarh & Tri-City (240 members), Amritsar, Bathinda & Jaipur.'
    },
    {
      title: 'Single-Community Rule:',
      desc: 'Enforces the business logic that a student can belong to only one official hometown hub at a time, preventing spam and keeping local networks genuine.'
    },
    {
      title: 'Ride Sharing Notice Board:',
      desc: 'Hostellers can post ride-sharing notices (e.g. "Ertiga to Jalandhar Cantt Friday 5 PM - 2 seats open") specifying pickup gate, cost split, and travel tips.'
    },
    {
      title: 'One-Click Hometown Matching:',
      desc: 'A direct "Find Rides to City" action links community members straight into the journey matching algorithm pre-configured for their hometown.'
    }
  ];

  let lY = 1.6;
  commFeatures.forEach((f) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: lY,
      w: 5.7,
      h: 1.15,
      rectRadius: 0.08,
      fill: { color: C.white },
      line: { color: C.border, width: 1 }
    });

    slide.addText(f.title, {
      x: 1.0,
      y: lY + 0.1,
      w: 5.3,
      h: 0.3,
      fontSize: 11.5,
      color: C.bluePrimary,
      bold: true
    });

    slide.addText(f.desc, {
      x: 1.0,
      y: lY + 0.42,
      w: 5.3,
      h: 0.65,
      fontSize: 9.5,
      color: C.slateGray,
      lineSpacing: 13
    });

    lY += 1.3;
  });
}

// ==========================================
// SLIDE 5: Journey Creation & Smart Matching Engine
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: C.slateLight };

  slide.addText('INTELLIGENT ALGORITHM', {
    x: 0.8,
    y: 0.5,
    w: 11,
    h: 0.3,
    fontSize: 11,
    color: C.bluePrimary,
    bold: true
  });

  slide.addText('Journey Parameter Inputs & Smart Match Ranking', {
    x: 0.8,
    y: 0.8,
    w: 11,
    h: 0.6,
    fontSize: 24,
    color: C.navyDark,
    bold: true
  });

  // Two Screenshots Side-by-Side
  slide.addImage({
    path: path.join(SCREENSHOT_DIR, '5_journey_form.png'),
    x: 0.8,
    y: 1.6,
    w: 4.8,
    h: 4.3,
    sizing: { type: 'contain' }
  });

  slide.addImage({
    path: path.join(SCREENSHOT_DIR, '6_matching_results.png'),
    x: 5.8,
    y: 1.6,
    w: 4.8,
    h: 4.3,
    sizing: { type: 'contain' }
  });

  // Bottom Summary Bar
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 6.0,
    w: 11.7,
    h: 0.85,
    rectRadius: 0.08,
    fill: { color: C.navyDark }
  });

  slide.addText(
    'Algorithm Formula: Match Score = (Time Overlap Weight: 45%) + (Hostel Proximity Cluster: 30%) + (Transport Mode: 15%) + (Student Reliability Score: 10%)',
    {
      x: 1.0,
      y: 6.1,
      w: 11.3,
      h: 0.65,
      fontSize: 10,
      color: '93C5FD',
      align: 'center',
      bold: true
    }
  );
}

// ==========================================
// SLIDE 6: Group Formation & Coordination Chat
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: C.slateLight };

  slide.addText('COLLABORATIVE TRAVEL', {
    x: 0.8,
    y: 0.5,
    w: 11,
    h: 0.3,
    fontSize: 11,
    color: C.bluePrimary,
    bold: true
  });

  slide.addText('Group Formation, Member Capping & Real-Time Chat', {
    x: 0.8,
    y: 0.8,
    w: 11,
    h: 0.6,
    fontSize: 24,
    color: C.navyDark,
    bold: true
  });

  // Two Screenshots
  slide.addImage({
    path: path.join(SCREENSHOT_DIR, '7_group_details.png'),
    x: 0.8,
    y: 1.6,
    w: 5.6,
    h: 4.4,
    sizing: { type: 'contain' }
  });

  slide.addImage({
    path: path.join(SCREENSHOT_DIR, '8_group_chat.png'),
    x: 6.6,
    y: 1.6,
    w: 5.9,
    h: 4.4,
    sizing: { type: 'contain' }
  });

  // Bottom Key Highlights
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 6.1,
    w: 3.7,
    h: 0.75,
    rectRadius: 0.08,
    fill: { color: C.white },
    line: { color: C.border, width: 1 }
  });
  slide.addText('Max 4 Members per Cab\nOptimal cost-per-seat ratio', {
    x: 0.9,
    y: 6.15,
    w: 3.5,
    h: 0.65,
    fontSize: 9.5,
    color: C.navyDark,
    align: 'center',
    bold: true
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.8,
    y: 6.1,
    w: 3.7,
    h: 0.75,
    rectRadius: 0.08,
    fill: { color: C.white },
    line: { color: C.border, width: 1 }
  });
  slide.addText('Designated Campus Pickups\nMain Gate, Exec Mess, Hostel Gates', {
    x: 4.9,
    y: 6.15,
    w: 3.5,
    h: 0.65,
    fontSize: 9.5,
    color: C.navyDark,
    align: 'center',
    bold: true
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.8,
    y: 6.1,
    w: 3.7,
    h: 0.75,
    rectRadius: 0.08,
    fill: { color: C.white },
    line: { color: C.border, width: 1 }
  });
  slide.addText('In-App Group Coordination\nLive messaging without sharing personal numbers', {
    x: 8.9,
    y: 6.15,
    w: 3.5,
    h: 0.65,
    fontSize: 9.5,
    color: C.navyDark,
    align: 'center',
    bold: true
  });
}

// ==========================================
// SLIDE 7: Impact, Technical Architecture & Roadmap
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: C.navyDark };

  slide.addText('IMPACT & PROJECT ROADMAP', {
    x: 0.8,
    y: 0.6,
    w: 11,
    h: 0.3,
    fontSize: 11,
    color: '93C5FD',
    bold: true
  });

  slide.addText('Campus Value Delivery & Future Scope', {
    x: 0.8,
    y: 0.9,
    w: 11,
    h: 0.6,
    fontSize: 26,
    color: C.white,
    bold: true
  });

  // 3 Pillar Summary Cards
  const pillars = [
    {
      title: 'Student Cost Savings',
      metrics: '60% - 75% Reduction',
      desc: 'Chandigarh Airport cab drops from ₹1,400 to ~₹350/student. Station autos drop to ₹40/student, saving lakhs collectively per semester.'
    },
    {
      title: 'Campus Safety & Verification',
      metrics: '100% TIET Verified',
      desc: 'Eliminates travel with unknown strangers from outside platforms. Reliable reviews and peer hostel accountability.'
    },
    {
      title: 'Hometown Social Cohesion',
      metrics: '8 Regional Hubs',
      desc: 'Fosters hometown peer camaraderie across batches, making hostel life warmer for first-year and senior students alike.'
    }
  ];

  let colX = 0.8;
  pillars.forEach((p) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colX,
      y: 1.8,
      w: 3.6,
      h: 2.8,
      rectRadius: 0.1,
      fill: { color: '1E293B' },
      line: { color: '3B82F6', width: 1 }
    });

    slide.addText(p.title, {
      x: colX + 0.2,
      y: 2.0,
      w: 3.2,
      h: 0.4,
      fontSize: 14,
      color: C.white,
      bold: true
    });

    slide.addText(p.metrics, {
      x: colX + 0.2,
      y: 2.45,
      w: 3.2,
      h: 0.4,
      fontSize: 15,
      color: '34D399',
      bold: true
    });

    slide.addText(p.desc, {
      x: colX + 0.2,
      y: 3.0,
      w: 3.2,
      h: 1.4,
      fontSize: 10,
      color: '94A3B8',
      lineSpacing: 15
    });

    colX += 4.0;
  });

  // Architecture & Viva Summary
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 4.9,
    w: 11.6,
    h: 1.6,
    rectRadius: 0.1,
    fill: { color: '0284C7' }
  });

  slide.addText('TECHNICAL STACK & FUTURE ROADMAP (PHASE 2)', {
    x: 1.1,
    y: 5.05,
    w: 11.0,
    h: 0.3,
    fontSize: 11,
    color: C.white,
    bold: true
  });

  slide.addText(
    '• Frontend Stack: React 19, Vite 8, Tailwind CSS 4, Lucide React Icons.\n• Planned Backend: Node.js / Express REST API, MongoDB / PostgreSQL for persistent user & trip storage.\n• Production Enhancements: WebSockets / Socket.io for live chat updates, TIET Student Portal OAuth SSO, and Push Notifications.',
    {
      x: 1.1,
      y: 5.4,
      w: 11.0,
      h: 1.0,
      fontSize: 10.5,
      color: 'F0FDF4',
      lineSpacing: 16
    }
  );
}

// Generate Presentation
const outputPath = path.resolve('Thapar_Journey_Connect_7_Slides.pptx');
pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log(`Presentation generated successfully at: ${outputPath}`);
}).catch((err) => {
  console.error('Error generating presentation:', err);
});
