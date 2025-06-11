#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import fetch from 'node-fetch';

console.log('🧪 Testing CLI and Full Game Flow...');

// Helper function to wait for specific output
function waitForOutput(process, expectedText, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for: ${expectedText}`));
    }, timeout);

    const onData = (data) => {
      output += data.toString();
      if (output.includes(expectedText)) {
        clearTimeout(timer);
        process.stdout.off('data', onData);
        resolve(output);
      }
    };

    process.stdout.on('data', onData);
  });
}

// Helper function to send command and wait for prompt
async function sendCommand(process, command, waitForText = 'poker>') {
  process.stdin.write(command + '\n');
  await setTimeout(500); // Give time for command to process
  try {
    await waitForOutput(process, waitForText, 2000);
  } catch (error) {
    // Continue even if we don't see the prompt - some commands might not show it immediately
  }
}

// API helper to join second player directly
async function joinSecondPlayerViaAPI(gameId) {
  try {
    const response = await fetch('http://localhost:3000/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'joinGame',
        payload: {
          gameId,
          playerId: 'test_player_2',
          playerName: 'Bob',
          buyIn: 1000
        }
      })
    });
    
    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.log('⚠️ Failed to join second player via API:', error.message);
    return false;
  }
}

// API helper to apply action for other players
async function applyActionViaAPI(gameId, playerId, actionType, amount = undefined) {
  try {
    const action = { type: actionType, playerId, seatIndex: 1, timestamp: Date.now() };
    if (amount !== undefined) action.amount = amount;
    
    const response = await fetch('http://localhost:3000/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'applyAction',
        payload: { gameId, action }
      })
    });
    
    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.log(`⚠️ Failed to apply action ${actionType} via API:`, error.message);
    return false;
  }
}

// Main test function
async function runFullGameTest() {
  const cliProcess = spawn('npm', ['run', 'cli'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let hasError = false;
  let fullOutput = '';
  let errorOutput = '';

  // Capture all output
  cliProcess.stdout.on('data', (data) => {
    const text = data.toString();
    fullOutput += text;
    // Uncomment next line to see real-time output during debugging
    // process.stdout.write(text);
  });

  cliProcess.stderr.on('data', (data) => {
    const text = data.toString();
    errorOutput += text;
    console.log('⚠️ CLI stderr:', text);
  });

  cliProcess.on('error', (error) => {
    hasError = true;
    console.log('❌ CLI process error:', error.message);
  });

  try {
    console.log('\n🎯 Step 1: Wait for CLI to start...');
    await waitForOutput(cliProcess, 'Welcome to Poker CLI');
    console.log('✅ CLI started successfully');

    console.log('\n🎯 Step 2: Test help command...');
    await sendCommand(cliProcess, 'h');
    if (fullOutput.includes('Available Commands') && fullOutput.includes('start')) {
      console.log('✅ Help command shows start command');
    } else {
      console.log('❌ Help command missing start functionality');
    }

    console.log('\n🎯 Step 3: Create a new game...');
    await sendCommand(cliProcess, 'create');
    
    // Extract game ID from output
    const gameIdMatch = fullOutput.match(/Game ID: (game_\d+)/);
    if (!gameIdMatch) {
      throw new Error('Could not find game ID in output');
    }
    const gameId = gameIdMatch[1];
    console.log(`✅ Game created: ${gameId}`);

    console.log('\n🎯 Step 4: Join as first player...');
    await sendCommand(cliProcess, `join ${gameId} Alice`);
    if (fullOutput.includes('Successfully joined')) {
      console.log('✅ First player joined successfully');
    } else {
      console.log('❌ Failed to join as first player');
    }

    console.log('\n🎯 Step 5: Join second player via API...');
    const secondPlayerJoined = await joinSecondPlayerViaAPI(gameId);
    if (secondPlayerJoined) {
      console.log('✅ Second player joined via API');
    } else {
      console.log('❌ Failed to join second player');
    }

    console.log('\n🎯 Step 6: Check game info...');
    await sendCommand(cliProcess, 'info');
    if (fullOutput.includes('Ready to start hand') || fullOutput.includes('2/')) {
      console.log('✅ Game ready with 2 players');
    } else {
      console.log('⚠️ Game may not be ready (check output)');
    }

    console.log('\n🎯 Step 7: Start the hand...');
    await sendCommand(cliProcess, 'start');
    if (fullOutput.includes('New hand started') && fullOutput.includes('preflop')) {
      console.log('✅ Hand started successfully');
    } else {
      console.log('❌ Failed to start hand');
    }

    console.log('\n🎯 Step 8: Check legal actions...');
    await sendCommand(cliProcess, 'l');
    if (fullOutput.includes('Legal actions')) {
      console.log('✅ Legal actions available');
    } else {
      console.log('❌ No legal actions found');
    }

    console.log('\n🎯 Step 9: Play preflop round...');
    
    // In heads-up: button is small blind, acts first preflop
    // Let's try to check/call through preflop
    
    // Check current legal actions
    await sendCommand(cliProcess, 'l');
    
    if (fullOutput.includes('"type":"call"')) {
      console.log('  Player needs to call - calling...');
      await sendCommand(cliProcess, 'a call');
      await setTimeout(1000);
      console.log('  ✅ Called big blind');
    } else if (fullOutput.includes('"type":"check"')) {
      console.log('  Player can check - checking...');
      await sendCommand(cliProcess, 'a check');
      await setTimeout(1000);
      console.log('  ✅ Checked');
    }

    // Now other player needs to act - we'll do it via API
    console.log('  Having other player check via API...');
    await applyActionViaAPI(gameId, 'test_player_2', 'check');
    await setTimeout(1000);

    console.log('\n🎯 Step 10: Check if we progressed to flop...');
    await sendCommand(cliProcess, 'info');
    
    if (fullOutput.includes('flop')) {
      console.log('✅ Progressed to flop!');
      
      // Try one more round of checking
      console.log('\n🎯 Step 11: Play flop round...');
      await sendCommand(cliProcess, 'l');
      
      if (fullOutput.includes('"type":"check"')) {
        await sendCommand(cliProcess, 'a check');
        console.log('  ✅ Checked on flop');
        
        // Other player checks via API
        await applyActionViaAPI(gameId, 'test_player_2', 'check');
        await setTimeout(1000);
        
        await sendCommand(cliProcess, 'info');
        if (fullOutput.includes('turn')) {
          console.log('✅ Progressed to turn!');
        }
      }
    } else {
      console.log('⚠️ Still in preflop or hand ended');
    }

    console.log('\n🎯 Step 12: Final game state...');
    await sendCommand(cliProcess, 'info');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    hasError = true;
  }

  console.log('\n🎯 Step 13: Clean exit...');
  await sendCommand(cliProcess, 'exit');

  // Wait for process to close
  await new Promise((resolve) => {
    cliProcess.on('close', (code) => {
      resolve(code);
    });
  });

  return { hasError, fullOutput, errorOutput };
}

// Run the test
const { hasError, fullOutput, errorOutput } = await runFullGameTest();

console.log(`\n📋 Comprehensive Test Results:`);
console.log(`Success: ${!hasError ? '✅' : '❌'}`);

// Check for specific achievements
const achievements = [
  { name: 'CLI Startup', check: fullOutput.includes('Welcome to Poker CLI') },
  { name: 'Help Command', check: fullOutput.includes('Available Commands') },
  { name: 'Game Creation', check: fullOutput.includes('Game created successfully') },
  { name: 'Player Joining', check: fullOutput.includes('Successfully joined') },
  { name: 'Hand Starting', check: fullOutput.includes('New hand started') },
  { name: 'Legal Actions', check: fullOutput.includes('Legal actions') },
  { name: 'Preflop Play', check: fullOutput.includes('preflop') },
  { name: 'Action Execution', check: fullOutput.includes('call') || fullOutput.includes('check') },
  { name: 'Stage Progression', check: fullOutput.includes('flop') || fullOutput.includes('turn') },
  { name: 'Start Command Available', check: fullOutput.includes('start') && fullOutput.includes('Start a new hand') }
];

console.log('\n🏆 Achievement Report:');
achievements.forEach(({ name, check }) => {
  console.log(`${check ? '✅' : '❌'} ${name}`);
});

const successCount = achievements.filter(a => a.check).length;
console.log(`\n📊 Score: ${successCount}/${achievements.length} achievements unlocked`);

// Show key excerpts from output
console.log('\n📝 Key Output Excerpts:');
const keyPhrases = [
  'Game created successfully',
  'Successfully joined',
  'New hand started',
  'Legal actions',
  'preflop',
  'flop',
  'turn'
];

keyPhrases.forEach(phrase => {
  if (fullOutput.includes(phrase)) {
    const lines = fullOutput.split('\n');
    const matchingLine = lines.find(line => line.includes(phrase));
    if (matchingLine) {
      console.log(`  ${phrase}: ${matchingLine.trim()}`);
    }
  }
});

if (errorOutput.trim()) {
  console.log('\n🚨 Error Output:');
  console.log(errorOutput);
}

console.log('\n🎮 Test completed!');
process.exit(hasError ? 1 : 0); 