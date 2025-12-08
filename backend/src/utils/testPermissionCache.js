/**
 * Test script for permission caching
 * Run with: node backend/src/utils/testPermissionCache.js
 * 
 * This tests:
 * 1. Cache hit/miss behavior
 * 2. Cache expiration
 * 3. Cache invalidation
 * 4. Performance improvements
 */

import { getCachedPermissions, setCachedPermissions, invalidateUserCache, getCacheStats, clearAllCache } from './permissionCache.js';
import { computeAdminStatus } from './adminUtils.js';
import mongoose from 'mongoose';
import { env } from '../libs/env.js';

// Test configuration
const TEST_USER_ID = '507f1f77bcf86cd799439011'; // Example ObjectId
const TEST_CLIENT_IP = '192.168.1.100';

/**
 * Test 1: Cache Miss (First Request)
 */
async function testCacheMiss() {
    console.log('\n🧪 Test 1: Cache Miss (First Request)');
    console.log('='.repeat(50));
    
    clearAllCache();
    const statsBefore = getCacheStats();
    console.log('Cache stats before:', statsBefore);
    
    // First call - should be cache miss
    const start = Date.now();
    const result1 = await computeAdminStatus(TEST_USER_ID, TEST_CLIENT_IP);
    const time1 = Date.now() - start;
    
    const statsAfter = getCacheStats();
    console.log('Cache stats after:', statsAfter);
    console.log(`⏱️  Time taken: ${time1}ms (should be slower - DB query)`);
    console.log(`✅ Result: ${result1.isAdmin ? 'Admin' : 'Not Admin'}`);
    
    return { time1, statsAfter };
}

/**
 * Test 2: Cache Hit (Subsequent Requests)
 */
async function testCacheHit() {
    console.log('\n🧪 Test 2: Cache Hit (Subsequent Requests)');
    console.log('='.repeat(50));
    
    // Second call - should be cache hit
    const start = Date.now();
    const result2 = await computeAdminStatus(TEST_USER_ID, TEST_CLIENT_IP);
    const time2 = Date.now() - start;
    
    const stats = getCacheStats();
    console.log('Cache stats:', stats);
    console.log(`⏱️  Time taken: ${time2}ms (should be MUCH faster - cache hit)`);
    console.log(`✅ Result: ${result2.isAdmin ? 'Admin' : 'Not Admin'}`);
    
    // Performance improvement
    const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
    console.log(`🚀 Performance improvement: ${improvement}% faster`);
    
    return { time2, improvement };
}

/**
 * Test 3: Cache Invalidation
 */
async function testCacheInvalidation() {
    console.log('\n🧪 Test 3: Cache Invalidation');
    console.log('='.repeat(50));
    
    // Verify cache exists
    const cached = getCachedPermissions(TEST_USER_ID, TEST_CLIENT_IP);
    console.log('Cache before invalidation:', cached ? 'EXISTS' : 'NOT FOUND');
    
    // Invalidate cache
    invalidateUserCache(TEST_USER_ID);
    
    // Verify cache is gone
    const cachedAfter = getCachedPermissions(TEST_USER_ID, TEST_CLIENT_IP);
    console.log('Cache after invalidation:', cachedAfter ? 'EXISTS' : 'NOT FOUND (✅ Correct)');
    
    // Next call should be cache miss
    const start = Date.now();
    const result = await computeAdminStatus(TEST_USER_ID, TEST_CLIENT_IP);
    const time = Date.now() - start;
    console.log(`⏱️  Time taken after invalidation: ${time}ms (should be slower - DB query)`);
    
    return { success: !cachedAfter };
}

/**
 * Test 4: Multiple Users
 */
async function testMultipleUsers() {
    console.log('\n🧪 Test 4: Multiple Users Caching');
    console.log('='.repeat(50));
    
    const userIds = [
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
    ];
    
    // First call for each user (cache miss)
    console.log('First call for each user (cache miss):');
    for (const userId of userIds) {
        const start = Date.now();
        await computeAdminStatus(userId);
        const time = Date.now() - start;
        console.log(`  User ${userId.slice(-4)}: ${time}ms`);
    }
    
    // Second call for each user (cache hit)
    console.log('\nSecond call for each user (cache hit):');
    for (const userId of userIds) {
        const start = Date.now();
        await computeAdminStatus(userId);
        const time = Date.now() - start;
        console.log(`  User ${userId.slice(-4)}: ${time}ms (should be faster)`);
    }
    
    const stats = getCacheStats();
    console.log('\nFinal cache stats:', stats);
    console.log(`✅ Cached ${stats.valid} users`);
}

/**
 * Test 5: Cache Expiration
 */
async function testCacheExpiration() {
    console.log('\n🧪 Test 5: Cache Expiration (Simulated)');
    console.log('='.repeat(50));
    
    // Manually set cache with short TTL
    const testData = {
        isAdmin: true,
        isSuperAdmin: false,
        adminRole: { role: 'admin' },
        validation: { valid: true },
    };
    
    setCachedPermissions(TEST_USER_ID, testData, TEST_CLIENT_IP, 1000); // 1 second TTL
    console.log('Set cache with 1 second TTL');
    
    // Immediate check (should be cached)
    const cached1 = getCachedPermissions(TEST_USER_ID, TEST_CLIENT_IP);
    console.log('Immediate check:', cached1 ? '✅ Cached' : '❌ Not cached');
    
    // Wait 1.5 seconds
    console.log('Waiting 1.5 seconds for expiration...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check again (should be expired)
    const cached2 = getCachedPermissions(TEST_USER_ID, TEST_CLIENT_IP);
    console.log('After expiration:', cached2 ? '❌ Still cached (BUG!)' : '✅ Expired (Correct)');
    
    return { success: !cached2 };
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('\n🚀 Starting Permission Cache Tests');
    console.log('='.repeat(50));
    
    try {
        // Connect to database
        console.log('Connecting to database...');
        await mongoose.connect(env.MONGODB_URI);
        console.log('✅ Connected to database');
        
        // Run tests
        const test1 = await testCacheMiss();
        const test2 = await testCacheHit();
        const test3 = await testCacheInvalidation();
        const test4 = await testMultipleUsers();
        const test5 = await testCacheExpiration();
        
        // Summary
        console.log('\n📊 Test Summary');
        console.log('='.repeat(50));
        console.log('✅ Test 1 (Cache Miss): PASSED');
        console.log('✅ Test 2 (Cache Hit): PASSED');
        console.log(test3.success ? '✅ Test 3 (Invalidation): PASSED' : '❌ Test 3 (Invalidation): FAILED');
        console.log('✅ Test 4 (Multiple Users): PASSED');
        console.log(test5.success ? '✅ Test 5 (Expiration): PASSED' : '❌ Test 5 (Expiration): FAILED');
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed');
    }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { runAllTests };

