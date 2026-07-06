CREATE TABLE "OperationalQueueAcknowledgement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "academyId" TEXT NOT NULL,
  "signalId" TEXT NOT NULL,
  "acknowledgedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "OperationalQueueAcknowledgement_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OperationalQueueAcknowledgement_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OperationalQueueAcknowledgement_academyId_signalId_key" ON "OperationalQueueAcknowledgement"("academyId", "signalId");
CREATE INDEX "OperationalQueueAcknowledgement_academyId_idx" ON "OperationalQueueAcknowledgement"("academyId");
CREATE INDEX "OperationalQueueAcknowledgement_acknowledgedById_idx" ON "OperationalQueueAcknowledgement"("acknowledgedById");
