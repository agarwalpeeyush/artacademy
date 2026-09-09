-- V6__class_date_range.sql
-- A class (batch) can run over a fixed period; add an optional start/end date range.

ALTER TABLE CLASSES ADD COLUMN START_DATE DATE;
ALTER TABLE CLASSES ADD COLUMN END_DATE DATE;
