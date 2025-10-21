import request from "supertest";
import { mockDeep } from "jest-mock-extended";
import app from "../server.js";  // 🔹 Importa tu server una sola vez

// 🔹 Mocks
const mockFirebaseAdmin = mockDeep();
const mockPool = {
  query: jest.fn()
};

app.set("firebaseAdmin", mockFirebaseAdmin);
app.set("db", mockPool);

describe("Contract Tests - API SoundPodcastUdeC", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET / should return API message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("API SoundPodcastUdeC funcionando");
  });

  it("GET /api/podcasts should return an array of podcasts", async () => {
    // Mock de la base de datos
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, titulo: "Podcast 1", descripcion: "Desc", url: "url" }] });
    
    // Mock de Firebase
    mockFirebaseAdmin.auth.mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: "123" })
    });

    const res = await request(app)
      .get("/api/podcasts")
      .set("Authorization", "Bearer faketoken");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("id");
    expect(res.body[0]).toHaveProperty("titulo");
    expect(res.body[0]).toHaveProperty("descripcion");
    expect(res.body[0]).toHaveProperty("url");
  });

  it("POST /api/podcasts should create a new podcast", async () => {
    const newPodcast = { titulo: "Nuevo", descripcion: "Desc", url: "link" };

    // Mock DB
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 2, ...newPodcast }] });

    // Mock Firebase
    mockFirebaseAdmin.auth.mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: "123" })
    });

    const res = await request(app)
      .post("/api/podcasts")
      .set("Authorization", "Bearer faketoken")
      .send(newPodcast);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body.titulo).toBe(newPodcast.titulo);
    expect(res.body.descripcion).toBe(newPodcast.descripcion);
    expect(res.body.url).toBe(newPodcast.url);
  });

});
