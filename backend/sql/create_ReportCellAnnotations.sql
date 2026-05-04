/*
  Run once on the target database (e.g. abchc).
  Stores per-cell Complete flag + notes JSON for the session hours report UI.
*/
IF OBJECT_ID(N'dbo.ReportCellAnnotations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ReportCellAnnotations (
    CellKey NVARCHAR(512) NOT NULL,
    MrNumber NVARCHAR(200) NOT NULL,
    CellDate DATE NOT NULL,
    AuthStart DATE NULL,
    AuthEnd DATE NULL,
    AuthorizationNumber NVARCHAR(400) NULL,
    LocSummary NVARCHAR(400) NULL,
    PatientId NVARCHAR(100) NULL,
    Completed BIT NOT NULL CONSTRAINT DF_ReportCellAnnotations_Completed DEFAULT (0),
    NotesJson NVARCHAR(MAX) NULL,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ReportCellAnnotations_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ReportCellAnnotations PRIMARY KEY CLUSTERED (CellKey)
  );

  CREATE NONCLUSTERED INDEX IX_ReportCellAnnotations_CellDate_Mr
    ON dbo.ReportCellAnnotations (CellDate, MrNumber);
END
GO
