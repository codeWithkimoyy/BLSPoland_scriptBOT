# BLS Profile.txt - Complete Detailed Instructions

## 📋 Overview
This guide provides comprehensive instructions for filling out `Profile.txt` and `sample_profile_upload.txt` files for the BLS appointment booking script. Every field, dropdown value, and format requirement is explained in detail.

---

## 📁 File Format Rules
- **Format**: `field_name=value` (one per line)
- **Comments**: Lines starting with `#` are ignored
- **No spaces**: Don't add spaces around the `=` sign
- **Case sensitive**: Field names are case sensitive
- **Required**: All fields must have values (no empty fields)
- **Encoding**: Save as UTF-8 or ANSI

---

## 🏷️ Section 1: Personal Information

### Basic Personal Details
```
nationality_id=177
mobile_number=+639123456789
email=your.email@gmail.com
surname=YourLastName
surname_at_birth=YourBirthLastName
place_of_birth=YourBirthCity
```

**Field Explanations:**
- `nationality_id`: Your current nationality (see Country Codes below)
- `mobile_number`: Your phone number with country code (+63 for Philippines)
- `email`: Your valid email address
- `surname`: Your current last name
- `surname_at_birth`: Your last name at birth (maiden name if applicable)
- `place_of_birth`: City where you were born

### Gender and Status
```
gender=1
marital_status=3
country_of_birth=177
nationality_at_birth=177
```

**Gender Values:**
- `1` = Female
- `2` = Male

**Marital Status Values:**
- `1` = Married
- `2` = Divorced
- `3` = Single
- `4` = Widowed

### Birth Information
```
date_of_birth=1995-03-12
age=29
type_of_travel=1
passport_issue_by=177
passport_number=P123456789
```

**Date Format:** `YYYY-MM-DD` (Year-Month-Day)
**Age:** Your current age (must match date of birth)
**Type of Travel Values:**
- `1` = Ordinary passport
- `2` = Diplomatic passport
- `3` = Service passport

**Passport Number:** Your actual passport number (letters and numbers)

---

## 🏠 Section 2: Address Information

```
country=177
state_province=Metro Manila
postal_code=1000
street=Ortigas Avenue
house_number=123
flat_number=15A
```

**Field Explanations:**
- `country`: Your current country of residence (see Country Codes)
- `state_province`: Your state, province, or region
- `postal_code`: Your postal/ZIP code
- `street`: Your street name
- `house_number`: Your house/building number
- `flat_number`: Your apartment/unit number (if applicable)

---

## 👥 Section 3: Host Details (Who you're visiting)

```
host_type=person
host_surname=Anderson
host_name=James Anderson
host_country=237
host_place=New York
host_postal_code=10001
host_street=Broadway
host_house_number=500
host_flat_number=25B
host_phone_number=12125551234
```

**Host Type Values:**
- `person` = Individual person
- `company` = Company/organization
- `hotel` = Hotel accommodation
- `relative` = Family member

**Host Country:** Country where your host is located (see Country Codes)

---

## 📞 Section 4: Person/Company Details (Emergency Contact)

```
contact_person=Thompson
contact_name=Sarah Thompson
contact_place=Manila
contact_person_postal=1000
contact_person_street=Ayala Avenue
contact_person_house=45
contact_person_flat=8C
contact_person_phone_number=+639123456780
contact_person_email_add=sarah.thompson@gmail.com
```

**Field Explanations:**
- `contact_person`: Last name of emergency contact
- `contact_name`: Full name of emergency contact
- `contact_place`: City where contact is located
- `contact_person_email_add`: Valid email address

---

## 👨‍👩‍👧‍👦 Section 5: Father Details

```
father_name=Carlos
surname_father=Martinez
nationality_of_father=177
father_country=177
father_state_province=Metro Manila
father_place=Manila
father_postal_codes=1000
father_street=Roxas Boulevard
father_house_number=25
father_flat_number=3D
father_phone_number=+639123456781
father_email_add=carlos.martinez@gmail.com
```

**Field Explanations:**
- `father_name`: Father's first name
- `surname_father`: Father's last name
- `nationality_of_father`: Father's nationality (see Country Codes)
- `father_country`: Father's country of residence
- `father_email_add`: Father's email address

---

## 👩‍👧‍👦 Section 6: Mother Details

```
mother_name=Elena
surname_mother=Rodriguez
nationality_of_mother=177
mother_country=177
mother_state_province=Metro Manila
mother_place=Manila
mother_postal_codes=1000
mother_street=Roxas Boulevard
mother_house_number=25
mother_flat_number=3D
mother_phone_number=+639123456782
mother_email_add=elena.rodriguez@gmail.com
```

**Field Explanations:**
- `mother_name`: Mother's first name
- `surname_mother`: Mother's last name
- `nationality_of_mother`: Mother's nationality (see Country Codes)
- `mother_country`: Mother's country of residence
- `mother_email_add`: Mother's email address

---

## 💼 Section 7: Employer Details

```
employer=Global Tech Solutions
surname_employer=Global Tech
employer_country_id=177
employer_place=Makati City
employer_phone_number=+63281234567
employer_street=Ayala Avenue
employer_house_number=100
employer_flat_number=20F
employer_email_add=hr.globaltech@gmail.com
```

**Field Explanations:**
- `employer`: Company name
- `surname_employer`: Company short name
- `employer_country_id`: Country where company is located
- `employer_place`: City where company is located
- `employer_email_add`: Company email address

---

## ✈️ Section 8: Travel Details

```
destination_countries=237
border_of_first_entry=United States
date_of_arrival=2025-06-15
date_of_departure=2025-09-30
occupation=2
purpose_of_journey=2
number_of_entry=1
finger_prints_prev_collected=No
cost_coverage_id=1
means_of_support_id=2
```

### Travel Information
**Destination Countries:** Country you're visiting (see Country Codes)
**Border of First Entry:** First country you'll enter
**Date Format:** `YYYY-MM-DD` (use future dates)

### Occupation Values
- `1` = Student
- `2` = Employee
- `3` = Business owner
- `4` = Retired
- `5` = Unemployed
- `6` = Self-employed
- `7` = Freelancer

### Purpose of Journey Values
- `1` = Tourism
- `2` = Business
- `3` = Study
- `4` = Work
- `5` = Family visit
- `6` = Medical treatment
- `7` = Conference/Seminar
- `8` = Transit

### Number of Entry Values
- `1` = Single entry
- `2` = Multiple entry

### Fingerprints Previously Collected
- `Yes` = You have given fingerprints before
- `No` = First time giving fingerprints

### Cost Coverage Values
- `1` = Applicant (self-funded)
- `2` = Sponsor
- `3` = Company
- `4` = Government

### Means of Support Values
- `1` = Cash
- `2` = Credit Card
- `3` = Bank Transfer
- `4` = Sponsor
- `5` = Traveler's Check
- `6` = Other

---

## 🌍 Country Codes Reference

### Major Countries
```
177 = Philippines
237 = United States
75 = Poland
44 = United Kingdom
33 = France
49 = Germany
39 = Italy
34 = Spain
81 = Japan
82 = South Korea
86 = China
91 = India
61 = Australia
1 = Canada
```

### European Countries
```
40 = Romania
41 = Switzerland
43 = Austria
45 = Denmark
46 = Sweden
47 = Norway
48 = Poland
351 = Portugal
352 = Luxembourg
353 = Ireland
354 = Iceland
355 = Albania
356 = Malta
357 = Cyprus
358 = Finland
359 = Bulgaria
370 = Lithuania
371 = Latvia
372 = Estonia
373 = Moldova
374 = Armenia
375 = Belarus
376 = Andorra
377 = Monaco
378 = San Marino
380 = Ukraine
381 = Serbia
382 = Montenegro
383 = Kosovo
385 = Croatia
386 = Slovenia
387 = Bosnia and Herzegovina
389 = North Macedonia
```

### Asian Countries
```
60 = Malaysia
62 = Indonesia
63 = Philippines
65 = Singapore
66 = Thailand
84 = Vietnam
880 = Bangladesh
92 = Pakistan
93 = Afghanistan
94 = Sri Lanka
95 = Myanmar
98 = Iran
```

---

## 📱 Phone Number Formats

### Philippines
- Format: `+639XXXXXXXXX`
- Example: `+639123456789`
- Must be 12 digits total (+63 + 10 digits)

### United States
- Format: `+1XXXXXXXXXX`
- Example: `+12125551234`
- Must be 12 digits total (+1 + 10 digits)

### Poland
- Format: `+48XXXXXXXXX`
- Example: `+48221234567`
- Must be 12 digits total (+48 + 9 digits)

### General Rules
- Always include country code
- Use `+` before country code
- No spaces or dashes
- Minimum 10 digits after country code

---

## 📧 Email Address Requirements

### Valid Email Formats
- `name@domain.com`
- `firstname.lastname@company.com`
- `user123@email.org`
- `contact@business.net`

### Invalid Email Formats
- `0000000000` (numbers only)
- `invalid-email` (no @ symbol)
- `user@` (incomplete domain)
- `@domain.com` (no username)

---

## 📅 Date Format Requirements

### Standard Format
- **Format**: `YYYY-MM-DD`
- **Example**: `2025-06-15`
- **Year**: 4 digits (2025, 2026, etc.)
- **Month**: 2 digits (01-12)
- **Day**: 2 digits (01-31)

### Valid Date Examples
```
2025-01-15  (January 15, 2025)
2025-06-30  (June 30, 2025)
2025-12-25  (December 25, 2025)
2026-03-08  (March 8, 2026)
```

### Invalid Date Examples
```
15-06-2025  (Wrong format)
2025/06/15  (Wrong separator)
2025-6-15   (Missing leading zero)
25-06-15    (Wrong year format)
```

---

## ✅ Validation Checklist

### Before Saving Your Profile.txt:

#### Personal Information
- [ ] All required fields filled
- [ ] Email address is valid format
- [ ] Phone number has country code
- [ ] Date of birth matches age
- [ ] Gender and marital status are valid numbers

#### Address Information
- [ ] Country code is valid
- [ ] Postal code is correct
- [ ] Street address is complete

#### Host Details
- [ ] Host type is valid
- [ ] Host country code is correct
- [ ] Host phone number has country code

#### Contact Information
- [ ] Contact person email is valid
- [ ] Phone numbers have country codes
- [ ] All email addresses are valid

#### Travel Information
- [ ] Travel dates are in the future
- [ ] Destination country is valid
- [ ] Occupation and purpose are valid numbers
- [ ] Entry type is valid

#### File Format
- [ ] No spaces around `=` signs
- [ ] One field per line
- [ ] No empty lines between fields
- [ ] File saved as UTF-8 or ANSI

---

## 🚨 Common Mistakes to Avoid

### Format Errors
- ❌ `field_name = value` (spaces around =)
- ❌ `field_name= value` (space after =)
- ❌ `field_name =value` (space before =)
- ❌ Empty lines between fields
- ❌ Missing `=` sign

### Data Errors
- ❌ Invalid country codes
- ❌ Phone numbers without country codes
- ❌ Invalid email formats
- ❌ Past dates for travel
- ❌ Invalid dropdown values

### File Errors
- ❌ Wrong file encoding
- ❌ Extra spaces or characters
- ❌ Missing required fields
- ❌ Duplicate field names

---

## 🔧 Troubleshooting

### Script Not Reading Profile
1. Check file format (no spaces around =)
2. Verify all required fields are present
3. Ensure file is saved as UTF-8
4. Check for hidden characters

### Invalid Field Values
1. Verify country codes are correct
2. Check phone number format
3. Validate email addresses
4. Confirm dropdown values

### Date Issues
1. Use YYYY-MM-DD format
2. Ensure dates are in the future
3. Check for valid dates (not 2025-02-30)

---

## 📝 Sample Complete Profile

Here's a complete example of a properly formatted Profile.txt:

```
# BLS Profile Data - Complete Example
nationality_id=177
mobile_number=+639123456789
email=john.doe@gmail.com
surname=Doe
surname_at_birth=Smith
place_of_birth=Manila
gender=2
marital_status=3
country_of_birth=177
nationality_at_birth=177
date_of_birth=1990-05-15
age=34
type_of_travel=1
passport_issue_by=177
passport_number=P123456789
country=177
state_province=Metro Manila
postal_code=1000
street=Ortigas Avenue
house_number=123
flat_number=15A
host_type=person
host_surname=Johnson
host_name=Michael Johnson
host_country=237
host_place=New York
host_postal_code=10001
host_street=5th Avenue
host_house_number=500
host_flat_number=25B
host_phone_number=12125551234
contact_person=Brown
contact_name=Sarah Brown
contact_place=Manila
contact_person_postal=1000
contact_person_street=Ayala Avenue
contact_person_house=45
contact_person_flat=8C
contact_person_phone_number=+639123456780
contact_person_email_add=sarah.brown@gmail.com
father_name=Robert
surname_father=Doe
nationality_of_father=177
father_country=177
father_state_province=Metro Manila
father_place=Manila
father_postal_codes=1000
father_street=Roxas Boulevard
father_house_number=25
father_flat_number=3D
father_phone_number=+639123456781
father_email_add=robert.doe@gmail.com
mother_name=Maria
surname_mother=Smith
nationality_of_mother=177
mother_country=177
mother_state_province=Metro Manila
mother_place=Manila
mother_postal_codes=1000
mother_street=Roxas Boulevard
mother_house_number=25
mother_flat_number=3D
mother_phone_number=+639123456782
mother_email_add=maria.smith@gmail.com
employer=Tech Solutions Inc
surname_employer=Tech Solutions
employer_country_id=177
employer_place=Makati City
employer_phone_number=+63281234567
employer_street=Ayala Avenue
employer_house_number=100
employer_flat_number=20F
employer_email_add=hr.techsolutions@gmail.com
destination_countries=237
border_of_first_entry=United States
date_of_arrival=2025-06-15
date_of_departure=2025-09-30
occupation=2
purpose_of_journey=2
number_of_entry=1
finger_prints_prev_collected=No
cost_coverage_id=1
means_of_support_id=2
```

---

## 🎯 Quick Reference

### Essential Dropdown Values
- **Gender**: 1=Female, 2=Male
- **Marital Status**: 1=Married, 2=Divorced, 3=Single, 4=Widowed
- **Occupation**: 1=Student, 2=Employee, 3=Business, 4=Retired, 5=Unemployed
- **Purpose**: 1=Tourism, 2=Business, 3=Study, 4=Work, 5=Family visit
- **Entry Type**: 1=Single, 2=Multiple
- **Cost Coverage**: 1=Applicant, 2=Sponsor, 3=Company
- **Support**: 1=Cash, 2=Credit Card, 3=Bank Transfer, 4=Sponsor

### Key Country Codes
- **177** = Philippines
- **237** = United States
- **75** = Poland
- **44** = United Kingdom
- **1** = Canada

### Phone Format
- **Philippines**: +639XXXXXXXXX
- **USA**: +1XXXXXXXXXX
- **Poland**: +48XXXXXXXXX

### Date Format
- **YYYY-MM-DD** (e.g., 2025-06-15)

---

This comprehensive guide covers every aspect of filling out your Profile.txt file correctly. Follow these instructions carefully to ensure your BLS appointment booking script works perfectly!
