---
title: "Committees"
date: "2016-02-10"
layout: layouts/base.njk
---

# Falls Creek Ranch Committees

Falls Creek Ranch has several committees that help manage our operations and amenities.  Participation on committees by Falls Creek Ranch members is both valued and encouraged.  This is a great way to contribute to our community, share ideas and meet your neighbors and new friends.  All committees, other than the Architectural Control Committee, are established and maintained at the discretion of the Board of Directors.  The Board appoints Committee Chairs.  To join a committee, members are encouraged to contact the committee chair directly to share your interest and any relevant experience you can bring to our community.  The committee may meet with you to explain their work efforts and projects and how you may be able to contribute.

## Committees

<ul>{% for item in collections["committees"] | sort(false, false,
                'data.title') %} {% if item.template.parsed.base != "index.md"
                %}
<li><a href="{{ item.url }}">{{ item.data.title }}</a></li>
{% endif %} {% endfor %}
</ul>

## Other groups

**Ranch Liaison** - Mark Smith - This position serves as the supervisor to our Ranch Caretaker and interfaces between the Board, Committees, and Ranch residents for matters involving the Ranch Caretaker's duties (such as roads and water system operations). Residents are asked not to contact the Ranch Caretaker directly.

- [Ranch Manager Employment Contract (2011)](/static/2016/03/Ranch-Manager-Employment-Contract-2011.pdf)
- [Ranch Manager Employment Contract Amendment (1-27-16) (2)](/static/2016/03/Ranch-Manager-Employment-Contract-Amendment-1-27-16-2.pdf)
- [Ranch Manager Job Description (2011)](/static/2016/03/Ranch-Manager-Job-Description-2011.pdf)
- [Ranch Manager Liaison and Supervisor Position Description (2011)](/static/2016/03/Ranch-Manager-Liaison-and-Supervisor-Position-Description-2011.pdf)
- [Ranch Manager Performance Evaluation Form](/static/2016/03/Ranch-Manager-Performance-Evaluation-Form.pdf)
- [Ranch Manager Sick Leave Policy (2011)](/static/2016/03/Ranch-Manager-Sick-Leave-Policy-2011.pdf)
- [Ranch Manager Task List (2007)](/static/2016/03/Ranch-Manager-Task-List-2007.pdf)

**Records Management** - Mary Ann Bryant, Chair - This team collects, organizes, and files Ranch documents and records in compliance with state law requirements for homeowner associations.
