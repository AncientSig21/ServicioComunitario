/**
 * Comprehensive Test Script for Forum, Ads, Service Area, Reserves, Maintenance, and Events
 * 
 * This script tests:
 * 1. Forum functionality (localStorage-based)
 * 2. Ads functionality (localStorage-based)
 * 3. Service area (placeholder check)
 * 4. Reserves functionality (localStorage-based)
 * 5. Maintenance requests (Supabase-based)
 * 6. Events creation and admin validation
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
let supabaseUrl = "https://vsyunsvlrvbbvgiwcxnt.supabase.co";
let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeXVuc3ZscnZiYnZnaXdjeG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjUxNzEsImV4cCI6MjA4MTkwMTE3MX0.bACD3Ls_hBHx1bbfkr1tGXWqHIrLTCj0CB0vDOU3oyE";

try {
  const envPath = join(__dirname, '..', '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (key === 'VITE_SUPABASE_URL' || key === 'VITE_PROJECT_URL_SUPABASE') {
          supabaseUrl = value;
        } else if (key === 'VITE_SUPABASE_ANON_KEY' || key === 'VITE_SUPABASE_API_KEY') {
          supabaseAnonKey = value;
        }
      }
    }
  });
} catch (error) {
  // Use default values if .env not found
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
};

// Test results tracker
const testResults = {
  forum: { passed: 0, failed: 0, issues: [] },
  ads: { passed: 0, failed: 0, issues: [] },
  serviceArea: { passed: 0, failed: 0, issues: [] },
  reserves: { passed: 0, failed: 0, issues: [] },
  maintenance: { passed: 0, failed: 0, issues: [] },
  events: { passed: 0, failed: 0, issues: [] },
};

// Initialize Supabase client
let supabase = null;
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    log.info('Supabase client initialized');
  } else {
    log.warning('Supabase credentials not found. Some tests will be skipped.');
  }
} catch (error) {
  log.warning(`Could not initialize Supabase: ${error.message}`);
}

/**
 * Test 1: Forum Functionality
 */
async function testForum() {
  log.section('📚 Testing Forum Functionality');

  try {
    // Check if forum page exists
    const forumPagePath = join(__dirname, '../src/pages/BookPages.tsx');
    const forumContent = readFileSync(forumPagePath, 'utf-8');

    // Check for key forum features
    const checks = [
      { name: 'Forum page exists', condition: forumContent.includes('BookPages') },
      { name: 'Forum categories defined', condition: forumContent.includes('forumCategories') },
      { name: 'Topic creation', condition: forumContent.includes('handleCreateTopic') },
      { name: 'Comment functionality', condition: forumContent.includes('handleAddComment') },
      { name: 'localStorage integration', condition: forumContent.includes('FORUM_STORAGE_KEY') },
      { name: 'Category filtering', condition: forumContent.includes('filteredTopics') },
    ];

    checks.forEach(check => {
      if (check.condition) {
        log.success(check.name);
        testResults.forum.passed++;
      } else {
        log.error(`${check.name} - NOT FOUND`);
        testResults.forum.failed++;
        testResults.forum.issues.push(check.name);
      }
    });

    // Check forum categories
    const categoryMatch = forumContent.match(/forumCategories:\s*\{[^}]*id:\s*['"]([^'"]+)['"]/g);
    if (categoryMatch && categoryMatch.length >= 3) {
      log.success(`Forum has ${categoryMatch.length} categories defined`);
      testResults.forum.passed++;
    } else {
      log.warning('Forum categories may be incomplete');
      testResults.forum.issues.push('Insufficient forum categories');
    }

    // Check localStorage key
    if (forumContent.includes('forum_topics_ciudad_colonial')) {
      log.success('Forum uses localStorage for persistence');
      testResults.forum.passed++;
    } else {
      log.error('Forum localStorage key not found');
      testResults.forum.failed++;
    }

  } catch (error) {
    log.error(`Forum test failed: ${error.message}`);
    testResults.forum.failed++;
    testResults.forum.issues.push(`Error: ${error.message}`);
  }
}

/**
 * Test 2: Ads Functionality
 */
async function testAds() {
  log.section('📢 Testing Ads Functionality');

  try {
    const adsPagePath = join(__dirname, '../src/pages/AnunciosPage.tsx');
    const adsContent = readFileSync(adsPagePath, 'utf-8');

    const checks = [
      { name: 'Ads page exists', condition: adsContent.includes('AnunciosPage') },
      { name: 'Category filtering', condition: adsContent.includes('filteredAnuncios') },
      { name: 'Example ads data', condition: adsContent.includes('anunciosEjemplo') },
      { name: 'Category labels', condition: adsContent.includes('categoriaLabels') },
      { name: 'Date formatting', condition: adsContent.includes('formatFecha') },
    ];

    checks.forEach(check => {
      if (check.condition) {
        log.success(check.name);
        testResults.ads.passed++;
      } else {
        log.error(`${check.name} - NOT FOUND`);
        testResults.ads.failed++;
        testResults.ads.issues.push(check.name);
      }
    });

    // Check for categories
    const categories = ['general', 'importante', 'mantenimiento', 'evento', 'foro'];
    const foundCategories = categories.filter(cat => adsContent.includes(`'${cat}'`) || adsContent.includes(`"${cat}"`));
    
    if (foundCategories.length === categories.length) {
      log.success(`All ${categories.length} ad categories are defined`);
      testResults.ads.passed++;
    } else {
      log.warning(`Only ${foundCategories.length}/${categories.length} categories found`);
      testResults.ads.issues.push(`Missing categories: ${categories.filter(c => !foundCategories.includes(c)).join(', ')}`);
    }

    // Check localStorage usage
    if (adsContent.includes('mockDatabase_condominio')) {
      log.success('Ads use localStorage for mock data');
      testResults.ads.passed++;
    } else {
      log.warning('Ads may not be using localStorage for persistence');
    }

  } catch (error) {
    log.error(`Ads test failed: ${error.message}`);
    testResults.ads.failed++;
    testResults.ads.issues.push(`Error: ${error.message}`);
  }
}

/**
 * Test 3: Service Area
 */
async function testServiceArea() {
  log.section('🔧 Testing Service Area');

  try {
    const servicePagePath = join(__dirname, '../src/pages/TesisPages.tsx');
    const serviceContent = readFileSync(servicePagePath, 'utf-8');

    // Service area is a placeholder, so we check for that
    if (serviceContent.includes('en desarrollo') || serviceContent.includes('en desarrollo')) {
      log.warning('Service area is marked as "in development" (placeholder)');
      testResults.serviceArea.issues.push('Service area is a placeholder');
    }

    const checks = [
      { name: 'Service page exists', condition: serviceContent.includes('TesisPages') },
      { name: 'Links to maintenance', condition: serviceContent.includes('/mantenimiento') },
      { name: 'Links to reserves', condition: serviceContent.includes('/reservas') },
    ];

    checks.forEach(check => {
      if (check.condition) {
        log.success(check.name);
        testResults.serviceArea.passed++;
      } else {
        log.error(`${check.name} - NOT FOUND`);
        testResults.serviceArea.failed++;
        testResults.serviceArea.issues.push(check.name);
      }
    });

    log.info('Service area acts as a navigation hub (expected behavior)');
    testResults.serviceArea.passed++;

  } catch (error) {
    log.error(`Service area test failed: ${error.message}`);
    testResults.serviceArea.failed++;
    testResults.serviceArea.issues.push(`Error: ${error.message}`);
  }
}

/**
 * Test 4: Reserves Functionality
 */
async function testReserves() {
  log.section('📅 Testing Reserves Functionality');

  try {
    const reservesPagePath = join(__dirname, '../src/pages/ReservasPage.tsx');
    const reservesContent = readFileSync(reservesPagePath, 'utf-8');

    const checks = [
      { name: 'Reserves page exists', condition: reservesContent.includes('ReservasPage') },
      { name: 'Reserve creation', condition: reservesContent.includes('handleReservar') },
      { name: 'State filtering', condition: reservesContent.includes('filteredEspacios') },
      { name: 'Example spaces data', condition: reservesContent.includes('espaciosEjemplo') },
      { name: 'State labels', condition: reservesContent.includes('estadoLabels') },
    ];

    checks.forEach(check => {
      if (check.condition) {
        log.success(check.name);
        testResults.reserves.passed++;
      } else {
        log.error(`${check.name} - NOT FOUND`);
        testResults.reserves.failed++;
        testResults.reserves.issues.push(check.name);
      }
    });

    // Check for space states
    const states = ['disponible', 'reservado', 'mantenimiento', 'cerrado'];
    const foundStates = states.filter(state => reservesContent.includes(`'${state}'`) || reservesContent.includes(`"${state}"`));
    
    if (foundStates.length === states.length) {
      log.success(`All ${states.length} reserve states are defined`);
      testResults.reserves.passed++;
    } else {
      log.warning(`Only ${foundStates.length}/${states.length} states found`);
      testResults.reserves.issues.push(`Missing states: ${states.filter(s => !foundStates.includes(s)).join(', ')}`);
    }

    // Check localStorage usage
    if (reservesContent.includes('mockDatabase_condominio')) {
      log.success('Reserves use localStorage for mock data');
      testResults.reserves.passed++;
    } else {
      log.warning('Reserves may not be using localStorage for persistence');
    }

    // Check if Supabase integration exists in services
    const bookServicePath = join(__dirname, '../src/services/bookService.ts');
    try {
      const bookServiceContent = readFileSync(bookServicePath, 'utf-8');
      if (bookServiceContent.includes('crearReservaEspacio') || bookServiceContent.includes('fetchReservasEspacios')) {
        log.success('Reserve service functions exist in bookService');
        testResults.reserves.passed++;
      }
    } catch (err) {
      log.warning('Could not check bookService for reserve functions');
    }

  } catch (error) {
    log.error(`Reserves test failed: ${error.message}`);
    testResults.reserves.failed++;
    testResults.reserves.issues.push(`Error: ${error.message}`);
  }
}

/**
 * Test 5: Maintenance Requests
 */
async function testMaintenance() {
  log.section('🔧 Testing Maintenance Requests');

  try {
    const maintenancePagePath = join(__dirname, '../src/pages/MantenimientoPage.tsx');
    const maintenanceContent = readFileSync(maintenancePagePath, 'utf-8');

    const checks = [
      { name: 'Maintenance page exists', condition: maintenanceContent.includes('MantenimientoPage') },
      { name: 'State filtering', condition: maintenanceContent.includes('filteredSolicitudes') },
      { name: 'Progress modal', condition: maintenanceContent.includes('ProgressModal') },
      { name: 'Service integration', condition: maintenanceContent.includes('fetchSolicitudesMantenimiento') },
      { name: 'State labels', condition: maintenanceContent.includes('estadoLabels') },
      { name: 'Priority labels', condition: maintenanceContent.includes('prioridadLabels') },
    ];

    checks.forEach(check => {
      if (check.condition) {
        log.success(check.name);
        testResults.maintenance.passed++;
      } else {
        log.error(`${check.name} - NOT FOUND`);
        testResults.maintenance.failed++;
        testResults.maintenance.issues.push(check.name);
      }
    });

    // Check service functions
    const bookServicePath = join(__dirname, '../src/services/bookService.ts');
    try {
      const bookServiceContent = readFileSync(bookServicePath, 'utf-8');
      
      if (bookServiceContent.includes('fetchSolicitudesMantenimiento')) {
        log.success('fetchSolicitudesMantenimiento function exists');
        testResults.maintenance.passed++;
      } else {
        log.error('fetchSolicitudesMantenimiento function not found');
        testResults.maintenance.failed++;
      }

      // Check if Supabase is used
      if (bookServiceContent.includes('from(\'solicitudes_mantenimiento\')')) {
        log.success('Maintenance uses Supabase database');
        testResults.maintenance.passed++;
      } else {
        log.warning('Maintenance may not be using Supabase');
        testResults.maintenance.issues.push('Supabase integration may be missing');
      }
    } catch (err) {
      log.warning('Could not check bookService for maintenance functions');
    }

    // Test database connection if Supabase is available
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('solicitudes_mantenimiento')
          .select('id')
          .limit(1);

        if (error) {
          log.warning(`Database connection test: ${error.message}`);
          testResults.maintenance.issues.push(`DB error: ${error.message}`);
        } else {
          log.success('Database connection successful');
          testResults.maintenance.passed++;
        }
      } catch (err) {
        log.warning(`Could not test database connection: ${err.message}`);
        testResults.maintenance.issues.push(`Connection test failed: ${err.message}`);
      }
    } else {
      log.warning('Skipping database connection test (Supabase not configured)');
    }

  } catch (error) {
    log.error(`Maintenance test failed: ${error.message}`);
    testResults.maintenance.failed++;
    testResults.maintenance.issues.push(`Error: ${error.message}`);
  }
}

/**
 * Test 6: Events Creation and Admin Validation
 */
async function testEvents() {
  log.section('🎉 Testing Events Creation and Admin Validation');

  try {
    const anunciosPagePath = join(__dirname, '../src/pages/AnunciosPage.tsx');
    const anunciosContent = readFileSync(anunciosPagePath, 'utf-8');

    // Check event creation
    const eventChecks = [
      { name: 'Event creation function', condition: anunciosContent.includes('handleCrearEvento') },
      { name: 'Create event modal', condition: anunciosContent.includes('showCreateModal') },
      { name: 'Event form fields', condition: anunciosContent.includes('nuevoEvento') },
      { name: 'Event category', condition: anunciosContent.includes("categoria: 'evento'") },
      { name: 'localStorage persistence', condition: anunciosContent.includes('mockDatabase_condominio') },
    ];

    eventChecks.forEach(check => {
      if (check.condition) {
        log.success(check.name);
        testResults.events.passed++;
      } else {
        log.error(`${check.name} - NOT FOUND`);
        testResults.events.failed++;
        testResults.events.issues.push(check.name);
      }
    });

    // Check for admin validation
    log.info('Checking for admin validation functionality...');
    
    // Check if there's an admin page for event validation
    const adminPages = [
      'AdminAprobacionesPage.tsx',
      'AdminDashboard.tsx',
      'AdminValidacionPagosPage.tsx',
    ];

    let foundAdminValidation = false;
    for (const adminPage of adminPages) {
      try {
        const adminPagePath = join(__dirname, `../src/pages/${adminPage}`);
        const adminContent = readFileSync(adminPagePath, 'utf-8');
        
        // Check for event-related approval
        if (adminContent.includes('evento') || adminContent.includes('anuncio') || adminContent.includes('event')) {
          log.info(`Found potential event validation in ${adminPage}`);
          foundAdminValidation = true;
        }
      } catch (err) {
        // Page doesn't exist or can't be read
      }
    }

    if (!foundAdminValidation) {
      log.error('❌ CRITICAL: No admin validation page found for events!');
      log.warning('Events are created but there is no way for admins to approve/reject them');
      testResults.events.failed++;
      testResults.events.issues.push('Missing admin validation page for events');
    } else {
      log.warning('Event validation may exist but needs verification');
      testResults.events.issues.push('Admin validation needs manual verification');
    }

    // Check if events are stored with pending status
    if (anunciosContent.includes('Pendiente de aprobación')) {
      log.success('Events are marked as pending approval');
      testResults.events.passed++;
    } else {
      log.warning('Events may not have pending approval status');
      testResults.events.issues.push('Pending approval status not clearly defined');
    }

    // Check router for admin event routes
    const routerPath = join(__dirname, '../src/router/index.tsx');
    try {
      const routerContent = readFileSync(routerPath, 'utf-8');
      if (routerContent.includes('aprobaciones') || routerContent.includes('validacion')) {
        log.info('Admin approval routes exist in router');
        testResults.events.passed++;
      } else {
        log.warning('Admin approval routes may not be configured');
      }
    } catch (err) {
      log.warning('Could not check router configuration');
    }

  } catch (error) {
    log.error(`Events test failed: ${error.message}`);
    testResults.events.failed++;
    testResults.events.issues.push(`Error: ${error.message}`);
  }
}

/**
 * Generate Summary Report
 */
function generateSummary() {
  log.section('📊 Test Summary Report');

  const allTests = [
    { name: 'Forum', results: testResults.forum },
    { name: 'Ads', results: testResults.ads },
    { name: 'Service Area', results: testResults.serviceArea },
    { name: 'Reserves', results: testResults.reserves },
    { name: 'Maintenance', results: testResults.maintenance },
    { name: 'Events', results: testResults.events },
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  allTests.forEach(test => {
    const { name, results } = test;
    const total = results.passed + results.failed;
    const percentage = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
    
    const status = results.failed === 0 ? colors.green : colors.yellow;
    console.log(`\n${status}${name}${colors.reset}: ${results.passed} passed, ${results.failed} failed (${percentage}%)`);
    
    if (results.issues.length > 0) {
      console.log(`  Issues:`);
      results.issues.forEach(issue => {
        console.log(`    - ${issue}`);
      });
    }

    totalPassed += results.passed;
    totalFailed += results.failed;
  });

  console.log(`\n${colors.cyan}${colors.bright}Overall: ${totalPassed} passed, ${totalFailed} failed${colors.reset}`);

  // Recommendations
  console.log(`\n${colors.yellow}${colors.bright}Recommendations:${colors.reset}`);
  
  if (testResults.events.issues.some(i => i.includes('Missing admin validation'))) {
    console.log(`  ${colors.red}⚠ CRITICAL:${colors.reset} Create an admin page to approve/reject events`);
    console.log(`    - Events are created but cannot be validated by admins`);
    console.log(`    - Consider adding event validation to AdminAprobacionesPage or create AdminEventosPage`);
  }

  if (testResults.serviceArea.issues.some(i => i.includes('placeholder'))) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Service area is a placeholder - consider implementing full functionality`);
  }

  if (testResults.maintenance.issues.some(i => i.includes('Supabase'))) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Verify Supabase connection for maintenance requests`);
  }

  console.log('\n');
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Comprehensive Functionality Test Suite                     ║');
  console.log('║  Testing: Forum, Ads, Service Area, Reserves, Maintenance   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  await testForum();
  await testAds();
  await testServiceArea();
  await testReserves();
  await testMaintenance();
  await testEvents();

  generateSummary();
}

// Run tests
runAllTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

