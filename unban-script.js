// Using global fetch

// Function to unban user with ID 2 (admin1)
async function unbanAdmin1() {
  try {
    // First we need to login as the owner to get the authentication token
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'aggeloskwn',
        password: 'password',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Now call the unban endpoint with the token
    const unbanResponse = await fetch('http://localhost:5000/api/admin/users/2/unban', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!unbanResponse.ok) {
      throw new Error(`Unban failed: ${unbanResponse.statusText}`);
    }

    const unbanResult = await unbanResponse.json();
    console.log('Successfully unbanned admin1:', unbanResult);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Execute the unban function
unbanAdmin1();