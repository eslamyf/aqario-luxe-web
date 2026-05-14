const fs = require('fs');

function fixScssFile(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');

  // Replace SCSS variables with CSS variables
  file = file.replace(/\$gold-light:\s*#[a-zA-Z0-9]+;/g, '$gold-light: var(--gold-light);');
  file = file.replace(/\$gold:\s*#[a-zA-Z0-9]+;/g, '$gold: var(--gold);');
  file = file.replace(/\$obsidian-4:\s*#[a-zA-Z0-9]+;/g, '$obsidian-4: var(--obsidian-4);');
  file = file.replace(/\$obsidian-3:\s*#[a-zA-Z0-9]+;/g, '$obsidian-3: var(--obsidian-3);');
  file = file.replace(/\$obsidian-2:\s*#[a-zA-Z0-9]+;/g, '$obsidian-2: var(--obsidian-2);');
  file = file.replace(/\$obsidian:\s*#[a-zA-Z0-9]+;/g, '$obsidian: var(--obsidian);');
  file = file.replace(/\$mist:\s*#[a-zA-Z0-9]+;/g, '$mist: var(--mist);');
  file = file.replace(/\$white:\s*#[a-zA-Z0-9]+;/g, '$white: var(--white);');
  file = file.replace(/\$red:\s*#[a-zA-Z0-9]+;/g, '$red: var(--crimson);');

  // Replace rgba($var, 0.X) with color-mix
  file = file.replace(/rgba\(\$([a-zA-Z0-9-]+),\s*([0-9.]+)\)/g, (match, p1, p2) => {
    return `color-mix(in srgb, $${p1} ${Math.round(parseFloat(p2) * 100)}%, transparent)`;
  });

  // Replace hardcoded RGBAs that contain white/black
  file = file.replace(/rgba\(0,\s*0,\s*0,\s*([0-9.]+)\)/g, (match, p1) => {
    return `color-mix(in srgb, #000 ${Math.round(parseFloat(p1) * 100)}%, transparent)`;
  });
  file = file.replace(/rgba\(255,\s*255,\s*255,\s*([0-9.]+)\)/g, (match, p1) => {
    return `color-mix(in srgb, var(--white) ${Math.round(parseFloat(p1) * 100)}%, transparent)`;
  });

  fs.writeFileSync(filePath, file);
  console.log('Fixed', filePath);
}

function fixAccountOverview() {
  let file = fs.readFileSync('src/app/features/account/components/account-overview/account-overview.component.scss', 'utf8');
  file = file.replace(/linear-gradient\(135deg,\s*rgba\(20, 20, 20, 0.8\)\s*0%,\s*rgba\(10, 10, 10, 0.9\)\s*100%\)/g, 'linear-gradient(135deg, color-mix(in srgb, var(--obsidian-2) 80%, transparent) 0%, color-mix(in srgb, var(--obsidian) 90%, transparent) 100%)');
  file = file.replace(/linear-gradient\(135deg,\s*#1a1a1a,\s*#0a0a0a\)/g, 'linear-gradient(135deg, var(--obsidian-3), var(--obsidian))');
  file = file.replace(/background:\s*rgba\(10, 10, 10, 0.5\)/g, 'background: color-mix(in srgb, var(--obsidian) 50%, transparent)');
  file = file.replace(/color:\s*#fff/g, 'color: var(--white)');
  file = file.replace(/color:\s*#000/g, 'color: var(--obsidian)');
  file = file.replace(/border:\s*4px solid #050505/g, 'border: 4px solid var(--obsidian)');
  
  // replace all #fff and #000 that are not covered
  file = file.replace(/#fff/g, 'var(--white)');
  file = file.replace(/#000/g, 'var(--obsidian)');

  fs.writeFileSync('src/app/features/account/components/account-overview/account-overview.component.scss', file);
  console.log('Fixed account-overview');
}

function fixUserDashboard() {
  let file = fs.readFileSync('src/app/features/user dashboard/user-dashboard.component.scss', 'utf8');
  // It already uses var(--obsidian), but we need to fix the hardcoded rgba and #fff / #000
  file = file.replace(/rgba\(255,\s*255,\s*255,\s*([0-9.]+)\)/g, (match, p1) => {
    return `color-mix(in srgb, var(--white) ${Math.round(parseFloat(p1) * 100)}%, transparent)`;
  });
  file = file.replace(/rgba\(250,\s*250,\s*248,\s*([0-9.]+)\)/g, (match, p1) => {
    return `color-mix(in srgb, var(--white) ${Math.round(parseFloat(p1) * 100)}%, transparent)`;
  });
  file = file.replace(/#fff/g, 'var(--white)');
  file = file.replace(/rgba\(20,\s*20,\s*20,\s*([0-9.]+)\)/g, (match, p1) => {
    return `color-mix(in srgb, var(--obsidian-3) ${Math.round(parseFloat(p1) * 100)}%, transparent)`;
  });
  file = file.replace(/rgba\(10,\s*10,\s*10,\s*([0-9.]+)\)/g, (match, p1) => {
    return `color-mix(in srgb, var(--obsidian) ${Math.round(parseFloat(p1) * 100)}%, transparent)`;
  });
  fs.writeFileSync('src/app/features/user dashboard/user-dashboard.component.scss', file);
  console.log('Fixed user-dashboard');
}

fixScssFile('src/app/core/auth/auth-modal/auth-modal.component.scss');
fixScssFile('src/app/features/properties/components/property-detail/property-detail.component.scss');
fixAccountOverview();
fixUserDashboard();
