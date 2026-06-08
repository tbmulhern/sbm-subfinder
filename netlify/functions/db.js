const { neon } = require("@neondatabase/serverless");

const sql = neon("postgresql://neondb_owner:npg_Lf6w5DGlcZYx@ep-nameless-bar-aksiwxcn.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const { action, data } = JSON.parse(event.body || "{}");

  try {
    let result;

    switch (action) {
      // ── TEACHERS ──
      case "getTeachers":
        result = await sql`SELECT * FROM teachers ORDER BY name`;
        break;
      case "addTeacher":
        result = await sql`INSERT INTO teachers (name, classroom, phone, email, break_time) VALUES (${data.name}, ${data.classroom}, ${data.phone}, ${data.email}, ${data.break_time}) RETURNING *`;
        break;
      case "updateTeacher":
        result = await sql`UPDATE teachers SET name=${data.name}, classroom=${data.classroom}, phone=${data.phone}, email=${data.email}, break_time=${data.break_time} WHERE id=${data.id} RETURNING *`;
        break;
      case "deleteTeacher":
        result = await sql`DELETE FROM teachers WHERE id=${data.id} RETURNING *`;
        break;

      // ── SUBSTITUTES ──
      case "getSubs":
        result = await sql`SELECT * FROM substitutes ORDER BY name`;
        break;
      case "addSub":
        result = await sql`INSERT INTO substitutes (name, phone, email, opt_in_sms) VALUES (${data.name}, ${data.phone}, ${data.email}, ${data.opt_in_sms}) RETURNING *`;
        break;
      case "updateSub":
        result = await sql`UPDATE substitutes SET name=${data.name}, phone=${data.phone}, email=${data.email}, opt_in_sms=${data.opt_in_sms} WHERE id=${data.id} RETURNING *`;
        break;
      case "deleteSub":
        result = await sql`DELETE FROM substitutes WHERE id=${data.id} RETURNING *`;
        break;

      // ── REQUESTS ──
      case "getRequests":
        result = await sql`SELECT * FROM requests ORDER BY created_at DESC`;
        break;
      case "addRequest":
        result = await sql`INSERT INTO requests (teacher_id, teacher_name, classroom, break_time, date, time, notes, status) VALUES (${data.teacher_id}, ${data.teacher_name}, ${data.classroom}, ${data.break_time}, ${data.date}, ${data.time}, ${data.notes}, 'open') RETURNING *`;
        break;
      case "acceptRequest":
        result = await sql`UPDATE requests SET status='filled', accepted_by=${data.accepted_by} WHERE id=${data.id} RETURNING *`;
        break;
      case "deleteRequest":
        result = await sql`DELETE FROM requests WHERE id=${data.id} RETURNING *`;
        break;
      case "clearRequests":
        result = await sql`DELETE FROM requests RETURNING *`;
        break;

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};