package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"edubase/backend/internal/config"
	"edubase/backend/internal/models"
	mongorepo "edubase/backend/internal/repositories/mongo"
	"edubase/backend/pkg/hash"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// seed wipes demo collections and creates an admin plus sample data.
// All users get password == their phone and mustChangePassword = true.
func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))
	cfg := config.Load()

	ctx := context.Background()
	client, err := mongorepo.Connect(ctx, cfg.MongoURI)
	if err != nil {
		fmt.Println("mongo connect failed:", err)
		os.Exit(1)
	}
	defer client.Disconnect(ctx)

	db := client.Database(cfg.MongoDB)
	if err := mongorepo.EnsureIndexes(ctx, db); err != nil {
		fmt.Println("ensure indexes failed:", err)
		os.Exit(1)
	}

	// Wipe demo data for a deterministic seed.
	for _, col := range []string{"users", "courses", "groups", "enrollments", "lessons", "homeworks", "attendances", "grades", "tuition_ledgers", "payouts"} {
		if err := db.Collection(col).Drop(ctx); err != nil {
			fmt.Println("drop failed:", col, err)
		}
	}
	if err := mongorepo.EnsureIndexes(ctx, db); err != nil {
		fmt.Println("re-ensure indexes failed:", err)
		os.Exit(1)
	}

	repos := mongorepo.NewRepositories(db)

	mkPass := func(phone string) string {
		h, _ := hash.Password(phone)
		return h
	}

	// --- Admin ---
	adminPhone := "998901112233"
	admin := &models.User{
		Role:               models.RoleAdmin,
		FullName:           "Bosh Administrator",
		Phone:              adminPhone,
		PasswordHash:       mkPass(adminPhone),
		MustChangePassword: true,
		Status:             models.UserActive,
	}
	must(repos.Users.Create(ctx, admin), "create admin")

	// --- Mentors ---
	mentorData := []struct{ name, phone, spec string }{
		{"Akmal Karimov", "998901000001", "Frontend dasturlash"},
		{"Dilnoza Yusupova", "998901000002", "Matematika"},
	}
	mentorIDs := []primitive.ObjectID{}
	for _, m := range mentorData {
		u := &models.User{
			Role: models.RoleMentor, FullName: m.name, Phone: m.phone,
			Specialization: m.spec, Specializations: []string{m.spec},
			PasswordHash:       mkPass(m.phone),
			MustChangePassword: true, Status: models.UserActive,
		}
		must(repos.Users.Create(ctx, u), "create mentor")
		mentorIDs = append(mentorIDs, u.ID)
	}

	// --- Students ---
	studentNames := []string{
		"Jasur Toshmatov", "Malika Aliyeva", "Sardor Bekmurodov",
		"Nodira Qodirova", "Bekzod Rasulov", "Gulnoza Ismoilova",
	}
	studentIDs := []primitive.ObjectID{}
	for i, name := range studentNames {
		phone := fmt.Sprintf("99890200%04d", i+1)
		u := &models.User{
			Role: models.RoleStudent, FullName: name, Phone: phone,
			PasswordHash: mkPass(phone), MustChangePassword: true, Status: models.UserActive,
		}
		must(repos.Users.Create(ctx, u), "create student")
		studentIDs = append(studentIDs, u.ID)
	}

	// --- Courses ---
	now := time.Now()
	mkPrices := func(months int, price int64) []models.MonthlyPrice {
		out := []models.MonthlyPrice{}
		for i := 1; i <= months; i++ {
			out = append(out, models.MonthlyPrice{MonthIndex: i, Price: price})
		}
		return out
	}
	frontend := &models.Course{
		Title: "Frontend dasturlash", Description: "HTML, CSS, JavaScript va React",
		DurationMonths: 6, MonthlyPrices: mkPrices(6, 600000), LessonsPerMonth: 12,
		MentorRatePerStudent: 25000,
		MentorRateHistory:    []models.MentorRate{{Rate: 25000, EffectiveFrom: now}},
		Status:               models.CourseActive,
	}
	must(repos.Courses.Create(ctx, frontend), "create course frontend")

	math := &models.Course{
		Title: "Matematika", Description: "Maktab va abituriyentlar uchun matematika",
		DurationMonths: 9, MonthlyPrices: mkPrices(9, 400000), LessonsPerMonth: 8,
		MentorRatePerStudent: 18000,
		MentorRateHistory:    []models.MentorRate{{Rate: 18000, EffectiveFrom: now}},
		Status:               models.CourseActive,
	}
	must(repos.Courses.Create(ctx, math), "create course math")

	// --- Groups ---
	groupStart := now.AddDate(0, 0, -20)
	g1 := &models.Group{
		Name: "Frontend-01", CourseID: frontend.ID,
		MentorIDs: []primitive.ObjectID{mentorIDs[0]}, StudentLimit: 15,
		Schedule:  models.Schedule{Days: []string{"mon", "wed", "fri"}, StartTime: "18:00", EndTime: "20:00", Room: "A1"},
		StartDate: groupStart, Status: models.GroupActive,
	}
	must(repos.Groups.Create(ctx, g1), "create group 1")

	g2 := &models.Group{
		Name: "Matematika-01", CourseID: math.ID,
		MentorIDs: []primitive.ObjectID{mentorIDs[1]}, StudentLimit: 20,
		Schedule:  models.Schedule{Days: []string{"tue", "thu", "sat"}, StartTime: "16:00", EndTime: "17:30", Room: "B2"},
		StartDate: groupStart, Status: models.GroupActive,
	}
	must(repos.Groups.Create(ctx, g2), "create group 2")

	// --- Enrollments ---
	enroll := func(studentID, groupID primitive.ObjectID) {
		e := &models.Enrollment{StudentID: studentID, GroupID: groupID, JoinedAt: groupStart, Status: models.EnrollmentActive}
		must(repos.Enrollments.Create(ctx, e), "create enrollment")
	}
	enroll(studentIDs[0], g1.ID)
	enroll(studentIDs[1], g1.ID)
	enroll(studentIDs[2], g1.ID)
	enroll(studentIDs[3], g2.ID)
	enroll(studentIDs[4], g2.ID)
	enroll(studentIDs[5], g2.ID)

	fmt.Println("\n========================================")
	fmt.Println(" EduBase seed muvaffaqiyatli yakunlandi")
	fmt.Println("========================================")
	fmt.Println(" ADMIN LOGIN:")
	fmt.Println("   Telefon: ", adminPhone)
	fmt.Println("   Parol:   ", adminPhone, "(birinchi kirishda o'zgartiriladi)")
	fmt.Println("----------------------------------------")
	fmt.Println(" Barcha foydalanuvchilar paroli = telefon raqami")
	fmt.Printf(" Mentorlar: %d ta, O'quvchilar: %d ta, Kurslar: 2, Guruhlar: 2\n", len(mentorIDs), len(studentIDs))
	fmt.Println("========================================")
}

func must(err error, msg string) {
	if err != nil {
		fmt.Printf("seed error (%s): %v\n", msg, err)
		os.Exit(1)
	}
}
