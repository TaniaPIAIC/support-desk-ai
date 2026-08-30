CREATE TABLE `ticketMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`authorId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticketMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketNumber` varchar(32) NOT NULL,
	`customerId` int NOT NULL,
	`assigneeId` int,
	`subject` varchar(240) NOT NULL,
	`description` text NOT NULL,
	`status` enum('new','in_progress','waiting_on_customer','resolved') NOT NULL DEFAULT 'new',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`category` varchar(64) NOT NULL DEFAULT 'General',
	`aiSummary` text,
	`aiSuggestedRoute` varchar(120),
	`aiConfidence` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_ticketNumber_unique` UNIQUE(`ticketNumber`)
);
