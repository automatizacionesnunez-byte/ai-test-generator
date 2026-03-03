
const KEY = 'CDRSVP1-R1K4H3G-NBJE7F9-49BEK2T';
const SLUG = 'test-joaqui';

async function test() {
    try {
        const res = await fetch(`http://158.220.121.111:3001/api/v1/workspace/${SLUG}`, {
            headers: { 'Authorization': `Bearer ${KEY}` }
        });
        const json = await res.json();
        console.log("Workspace documents:");
        console.dir(json.workspace[0]?.documents || json.workspace?.documents || json, { depth: null });
    } catch (e) {
        console.log(e);
    }
}
test();
