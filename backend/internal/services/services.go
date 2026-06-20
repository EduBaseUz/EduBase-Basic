package services

import (
	"edubase/backend/internal/repositories"
	"edubase/backend/pkg/jwt"
)

// Services bundles all service objects for handler injection.
type Services struct {
	Auth      *AuthService
	User      *UserService
	Course    *CourseService
	Group     *GroupService
	Journal   *JournalService
	Rating    *RatingService
	Tuition   *TuitionService
	Payout    *PayoutService
	Academic  *AcademicService
	Dashboard *DashboardService
	Settings  *SettingsService
	OrgFinance *OrgFinanceService
}

// New builds the full service set from repositories and a JWT manager.
func New(repos *repositories.Repositories, jwtMgr *jwt.Manager) *Services {
	return &Services{
		Auth:    NewAuthService(repos.Users, jwtMgr),
		User:    NewUserService(repos.Users, repos.DefaultAvatars),
		Course:  NewCourseService(repos.Courses),
		Group:   NewGroupService(repos.Groups, repos.Courses, repos.Users, repos.Enrollments),
		Journal: NewJournalService(repos.Groups, repos.Courses, repos.Lessons, repos.Homeworks, repos.Attendances, repos.Grades, repos.Enrollments),
		Rating:  NewRatingService(repos.Groups, repos.Users, repos.Grades, repos.Attendances, repos.Enrollments),
		Tuition: NewTuitionService(repos.Tuition, repos.Lessons, repos.Attendances, repos.Enrollments, repos.Groups, repos.Courses, repos.Users),
		Payout:  NewPayoutService(repos.Payouts, repos.Lessons, repos.Attendances, repos.Users, repos.Courses, repos.Groups),
		Academic: NewAcademicService(repos.Groups, repos.Enrollments, repos.Lessons, repos.Attendances, repos.Grades),
		Dashboard:  NewDashboardService(repos),
		Settings:   NewSettingsService(repos.DefaultAvatars),
		OrgFinance: NewOrgFinanceService(repos.OrgTransactions),
	}
}
