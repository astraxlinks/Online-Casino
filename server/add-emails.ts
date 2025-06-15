import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Script to add email addresses to existing accounts
 */
async function addEmailsToAccounts() {
  try {
    console.log('Adding email addresses to specific accounts...');

    // Update owner's account (aggeloskwn)
    const ownerUsername = 'aggeloskwn';
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.username, ownerUsername));

    if (owner) {
      await db
        .update(users)
        .set({ email: 'k1ngsx@icloud.com' })
        .where(eq(users.id, owner.id));
      console.log(`Updated email for ${ownerUsername}`);
    } else {
      console.log(`User ${ownerUsername} not found`);
    }

    // Update addys's account
    const addysUsername = 'addys';
    const [addys] = await db
      .select()
      .from(users)
      .where(eq(users.username, addysUsername));

    if (addys) {
      await db
        .update(users)
        .set({ email: 'venomaddysontop@gmail.com' })
        .where(eq(users.id, addys.id));
      console.log(`Updated email for ${addysUsername}`);
    } else {
      console.log(`User ${addysUsername} not found`);
    }

    // Add default emails to all other accounts that don't have one
    const usersWithoutEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, null) as any);

    let updatedCount = 0;
    for (const user of usersWithoutEmail) {
      await db
        .update(users)
        .set({ email: `${user.username}@ragebet.example.com` })
        .where(eq(users.id, user.id));
      updatedCount++;
    }

    console.log(`Added default emails to ${updatedCount} other accounts`);
    console.log('Email update complete');
  } catch (error) {
    console.error('Error updating emails:', error);
  }
}

// Run the function
addEmailsToAccounts().then(() => {
  console.log('Script complete');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});